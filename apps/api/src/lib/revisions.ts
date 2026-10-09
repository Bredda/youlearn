import {
	type ChangeImpact,
	courseDurationMinutes,
	diffContent,
	updateSummary,
} from "@youlearn/content";
import {
	and,
	asc,
	count,
	db,
	desc,
	eq,
	ilike,
	inArray,
	isNull,
	notInArray,
	or,
	schema,
	sql,
} from "@youlearn/db";
import type {
	CourseContent,
	MyReview,
	PublishImpact,
	ReviewBase,
	ReviewerRef,
	ReviewVerdict,
	RevisionStatus,
	WriterRevision,
	WriterRevisionDetail,
} from "@youlearn/types";
import {
	adjectives,
	animals,
	uniqueNamesGenerator,
} from "unique-names-generator";
import type { CourseActor } from "./courses";
import {
	impactBlocker,
	impactToStore,
	isEditable,
	normalizeReviewerIds,
	openRevisionBlocker,
	previewBlocker,
	reviewerState,
	reviewersBlocker,
	reviewWarnings,
	summarizeReview,
	TRANSITIONS,
} from "./revision-rules";
import { escapeLike } from "./sql";

const {
	course,
	courseRevision,
	reviewComment,
	revisionContributor,
	revisionReviewer,
	user,
} = schema;

/** Docker-like business id: `whispering_toucan`. */
export const generateRevisionKey = () =>
	uniqueNamesGenerator({
		dictionaries: [adjectives, animals],
		separator: "_",
		length: 2,
		style: "lowerCase",
	});

type Revision = typeof courseRevision.$inferSelect;
type Ref = Pick<Revision, "id" | "key">;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Locks the course row so concurrent status changes on its revisions are serialized. */
async function lockCourse(tx: Tx, courseId: string) {
	await tx
		.select({ id: course.id })
		.from(course)
		.where(eq(course.id, courseId))
		.for("update");
}

/** Records that `actor` changed the revision (the creator counts as the first contributor). */
export async function addContributor(
	tx: Tx,
	revisionId: string,
	actor: Pick<CourseActor, "id" | "name">,
) {
	await tx
		.insert(revisionContributor)
		.values({ revisionId, userId: actor.id, userLabel: actor.name })
		.onConflictDoUpdate({
			target: [revisionContributor.revisionId, revisionContributor.userId],
			// Keep the label fresh and bump `updatedAt` (the `$onUpdate` hook only runs on `update()`).
			set: { userLabel: actor.name, updatedAt: new Date() },
		});
}

async function toWriterRevisions(rows: Revision[]): Promise<WriterRevision[]> {
	if (rows.length === 0) return [];
	const contributors = await db
		.select()
		.from(revisionContributor)
		.where(
			inArray(
				revisionContributor.revisionId,
				rows.map((row) => row.id),
			),
		)
		.orderBy(asc(revisionContributor.createdAt));
	const reviewers = await db
		.select({
			revisionId: revisionReviewer.revisionId,
			userId: user.id,
			name: user.name,
			email: user.email,
			verdict: revisionReviewer.verdict,
			verdictRevisionUpdatedAt: revisionReviewer.verdictRevisionUpdatedAt,
		})
		.from(revisionReviewer)
		.innerJoin(user, eq(user.id, revisionReviewer.userId))
		.where(
			inArray(
				revisionReviewer.revisionId,
				rows.map((row) => row.id),
			),
		)
		.orderBy(asc(revisionReviewer.createdAt));
	const openCounts = await openThreadCounts(
		rows.filter((row) => row.status === "preview").map((row) => row.id),
	);
	return rows.map((row) => {
		const mine = reviewers
			.filter((r) => r.revisionId === row.id)
			.map(({ revisionId: _, verdict, verdictRevisionUpdatedAt, ...who }) => ({
				...who,
				state: reviewerState(
					{
						verdict,
						verdictRevisionUpdatedAt:
							verdictRevisionUpdatedAt?.getTime() ?? null,
					},
					row.updatedAt.getTime(),
				),
			}));
		return {
			id: row.id,
			courseId: row.courseId,
			key: row.key,
			status: row.status,
			parentId: row.parentId,
			purpose: row.purpose,
			durationMinutes: row.durationMinutes,
			certifying: row.certifying,
			changeImpact: row.changeImpact,
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
			contributors: contributors
				.filter((c) => c.revisionId === row.id)
				.map((c) => ({ userId: c.userId, name: c.userLabel })),
			reviewers: mine,
			review:
				row.status === "preview"
					? summarizeReview(
							mine.map((r) => r.state),
							openCounts.get(row.id) ?? 0,
						)
					: null,
		};
	});
}

/** Open remarks per revision (the roots of the threads still open). */
async function openThreadCounts(revisionIds: string[]) {
	const counts = new Map<string, number>();
	if (revisionIds.length === 0) return counts;
	const rows = await db
		.select({
			revisionId: reviewComment.revisionId,
			count: sql<number>`count(*)::int`,
		})
		.from(reviewComment)
		.where(
			and(
				inArray(reviewComment.revisionId, revisionIds),
				isNull(reviewComment.parentId),
				eq(reviewComment.status, "open"),
			),
		)
		.groupBy(reviewComment.revisionId);
	for (const row of rows) counts.set(row.revisionId, row.count);
	return counts;
}

/** Newest first. */
export async function listRevisions(courseId: string) {
	const rows = await db
		.select()
		.from(courseRevision)
		.where(eq(courseRevision.courseId, courseId))
		.orderBy(asc(courseRevision.createdAt));
	return (await toWriterRevisions(rows)).reverse();
}

export async function findRevision(courseId: string, revisionId: string) {
	const [row] = await db
		.select()
		.from(courseRevision)
		.where(
			and(
				eq(courseRevision.courseId, courseId),
				eq(courseRevision.id, revisionId),
			),
		);
	return row && (await toWriterRevisions([row]))[0];
}

export async function findRevisionDetail(
	courseId: string,
	revisionId: string,
): Promise<WriterRevisionDetail | undefined> {
	const [row] = await db
		.select()
		.from(courseRevision)
		.where(
			and(
				eq(courseRevision.courseId, courseId),
				eq(courseRevision.id, revisionId),
			),
		);
	const revision = row && (await toWriterRevisions([row]))[0];
	return revision && row && { ...revision, content: row.content };
}

export type Failure = {
	error: string;
	status: 400 | 404 | 409;
	code?: string;
	/** For `CONFIRM_REQUIRED`: what is still open in the review. */
	warnings?: string[];
};
type Outcome<T> = ({ ok: true } & T) | ({ ok: false } & Failure);

/** Creates a draft, optionally cloned from another revision of the same course. */
export async function createRevision(
	courseId: string,
	actor: CourseActor,
	input: { key?: string; parentId?: string; purpose: string },
): Promise<Outcome<{ revisionId: string }>> {
	return db.transaction(async (tx) => {
		await lockCourse(tx, courseId);
		const existing = await tx
			.select()
			.from(courseRevision)
			.where(eq(courseRevision.courseId, courseId));

		const blocker = openRevisionBlocker(existing);
		if (blocker)
			return { ok: false, status: 409, code: "OPEN_REVISION", error: blocker };
		if (input.parentId && !existing.some((r) => r.id === input.parentId))
			return {
				ok: false,
				status: 400,
				error: "The revision to clone does not belong to this course",
			};

		const parent = existing.find((r) => r.id === input.parentId);
		const taken = new Set(existing.map((r) => r.key));
		let key = input.key;
		if (key && taken.has(key))
			return {
				ok: false,
				status: 409,
				error: "A revision with this id already exists",
			};
		for (let attempt = 0; !key && attempt < 20; attempt++) {
			const candidate = generateRevisionKey();
			if (!taken.has(candidate)) key = candidate;
		}
		if (!key)
			return {
				ok: false,
				status: 409,
				error: "Could not generate a free revision id, set one",
			};

		const [created] = await tx
			.insert(courseRevision)
			.values({
				courseId,
				key,
				parentId: input.parentId ?? null,
				purpose: input.purpose,
				// Cloning copies the content; the files it refers to are shared (assets are immutable).
				...(parent && {
					content: parent.content,
					durationMinutes: parent.durationMinutes,
					certifying: parent.certifying,
				}),
			})
			.returning({ id: courseRevision.id });
		if (!created) throw new Error("Revision insert returned no row");
		await addContributor(tx, created.id, actor);
		return { ok: true, revisionId: created.id };
	});
}

export type ReviewerChanges = { added: ReviewerRef[]; removed: ReviewerRef[] };

/** A message when some of these users do not exist or are disabled (they cannot review), null otherwise. */
async function missingReviewers(tx: Tx, userIds: string[]) {
	if (userIds.length === 0) return null;
	const found = await tx
		.select({ id: user.id })
		.from(user)
		.where(and(inArray(user.id, userIds), eq(user.banned, false)));
	return found.length === userIds.length
		? null
		: "Some of the chosen reviewers do not exist or are disabled";
}

async function reviewersOf(tx: Tx, revisionId: string): Promise<ReviewerRef[]> {
	return tx
		.select({ userId: user.id, name: user.name, email: user.email })
		.from(revisionReviewer)
		.innerJoin(user, eq(user.id, revisionReviewer.userId))
		.where(eq(revisionReviewer.revisionId, revisionId))
		.orderBy(asc(revisionReviewer.createdAt));
}

/** Makes `userIds` exactly the reviewers of the revision (already validated) and says what changed. */
async function replaceReviewers(
	tx: Tx,
	revisionId: string,
	userIds: string[],
): Promise<ReviewerChanges> {
	const current = await reviewersOf(tx, revisionId);
	const removed = current.filter((r) => !userIds.includes(r.userId));
	if (removed.length > 0)
		await tx.delete(revisionReviewer).where(
			and(
				eq(revisionReviewer.revisionId, revisionId),
				inArray(
					revisionReviewer.userId,
					removed.map((r) => r.userId),
				),
			),
		);
	const addedIds = userIds.filter(
		(id) => !current.some((r) => r.userId === id),
	);
	if (addedIds.length > 0)
		await tx
			.insert(revisionReviewer)
			.values(addedIds.map((userId) => ({ revisionId, userId })));
	const added = (await reviewersOf(tx, revisionId)).filter((r) =>
		addedIds.includes(r.userId),
	);
	return { added, removed };
}

/**
 * Moves a revision along the workflow. Whatever gets deprecated on the way (the previous published revision
 * when publishing, the revision itself when deprecating) must be acknowledged with `confirm`.
 */
export async function changeStatus(
	courseId: string,
	revisionId: string,
	to: RevisionStatus,
	confirm: boolean,
	/** The reviewers of a revision going to preview; left as they are when omitted. */
	reviewerIds?: string[],
	/** How much a publication over a published revision matters to the learners on it. */
	changeImpact?: ChangeImpact,
): Promise<
	Outcome<{
		from: RevisionStatus;
		key: string;
		/** The impact stored on the revision when it was just published over another one. */
		changeImpact: ChangeImpact | null;
		deprecated: Ref | null;
		reviewers: ReviewerChanges;
	}>
> {
	return db.transaction(async (tx) => {
		await lockCourse(tx, courseId);
		const rows = await tx
			.select()
			.from(courseRevision)
			.where(eq(courseRevision.courseId, courseId));
		const revision = rows.find((r) => r.id === revisionId);
		if (!revision)
			return { ok: false, status: 404, error: "Revision not found" };

		if (!TRANSITIONS[revision.status].includes(to))
			return {
				ok: false,
				status: 409,
				error: `A ${revision.status} revision cannot become ${to}`,
			};

		// A revision is proofread as it will be published: it must be complete.
		const blocker = to === "preview" ? previewBlocker(revision.content) : null;
		if (blocker)
			return {
				ok: false,
				status: 409,
				code: "INCOMPLETE",
				error: blocker,
			};

		let wanted: string[] | undefined;
		if (to === "preview" && reviewerIds) {
			wanted = normalizeReviewerIds(reviewerIds) ?? undefined;
			if (!wanted)
				return { ok: false, status: 400, error: "Too many reviewers" };
			const missing = await missingReviewers(tx, wanted);
			if (missing)
				return {
					ok: false,
					status: 400,
					code: "UNKNOWN_REVIEWER",
					error: missing,
				};
		}

		if (to === "preview") {
			const count = wanted
				? wanted.length
				: (await reviewersOf(tx, revision.id)).length;
			const noReviewer = reviewersBlocker(count);
			if (noReviewer)
				return {
					ok: false,
					status: 409,
					code: "NO_REVIEWER",
					error: noReviewer,
				};
		}

		const occupant = rows.find((r) => r.status === to && r.id !== revision.id);
		let deprecated: Revision | null = null;
		if (to === "published") deprecated = occupant ?? null;
		else if (to === "deprecated") deprecated = revision;
		else if (occupant)
			return {
				ok: false,
				status: 409,
				error: `Revision ${occupant.key} is already ${to}`,
			};

		const impactMissing =
			to === "published"
				? impactBlocker(deprecated !== null, changeImpact)
				: null;
		if (impactMissing)
			return {
				ok: false,
				status: 409,
				code: "IMPACT_REQUIRED",
				error: impactMissing,
			};

		// Publishing a revision whose review is not finished is allowed, but not without being told.
		let warnings: string[] = [];
		if (to === "published" && revision.status === "preview") {
			const reviewers = await tx
				.select({
					verdict: revisionReviewer.verdict,
					verdictRevisionUpdatedAt: revisionReviewer.verdictRevisionUpdatedAt,
				})
				.from(revisionReviewer)
				.where(eq(revisionReviewer.revisionId, revision.id));
			const open =
				(await openThreadCounts([revision.id])).get(revision.id) ?? 0;
			warnings = reviewWarnings(
				summarizeReview(
					reviewers.map((r) =>
						reviewerState(
							{
								verdict: r.verdict,
								verdictRevisionUpdatedAt:
									r.verdictRevisionUpdatedAt?.getTime() ?? null,
							},
							revision.updatedAt.getTime(),
						),
					),
					open,
				),
			);
		}

		if ((deprecated || warnings.length > 0) && !confirm)
			return {
				ok: false,
				status: 409,
				code: "CONFIRM_REQUIRED",
				error: [
					deprecated
						? `Revision ${deprecated.key} will be deprecated: confirmation required`
						: null,
					warnings.length > 0
						? `The review is not finished (${warnings.join(", ")}): confirmation required`
						: null,
				]
					.filter(Boolean)
					.join(". "),
				warnings,
			};

		// The old published revision goes first: only one revision can hold the status at a time.
		if (to === "published" && deprecated)
			await tx
				.update(courseRevision)
				.set({ status: "deprecated" })
				.where(eq(courseRevision.id, deprecated.id));
		await tx
			.update(courseRevision)
			.set({
				status: to,
				...(to === "published" && {
					changeImpact: impactToStore(deprecated !== null, changeImpact),
				}),
			})
			.where(eq(courseRevision.id, revision.id));

		const reviewers = wanted
			? await replaceReviewers(tx, revision.id, wanted)
			: { added: [], removed: [] };

		return {
			ok: true,
			from: revision.status,
			key: revision.key,
			changeImpact:
				to === "published"
					? impactToStore(deprecated !== null, changeImpact)
					: null,
			reviewers,
			deprecated:
				to === "published" && deprecated
					? { id: deprecated.id, key: deprecated.key }
					: null,
		};
	});
}

/**
 * What publishing a revision in review would do, so the writer can pick minor or major knowingly: the revision it
 * replaces, how many learners are mid-course and which chapters a major change would send back.
 */
export async function publishImpact(
	courseId: string,
	revisionId: string,
): Promise<Outcome<{ impact: PublishImpact }>> {
	const rows = await db
		.select()
		.from(courseRevision)
		.where(eq(courseRevision.courseId, courseId));
	const revision = rows.find((r) => r.id === revisionId);
	if (!revision) return { ok: false, status: 404, error: "Revision not found" };
	if (revision.status !== "preview")
		return {
			ok: false,
			status: 409,
			error: "Only a revision in review can be published",
		};
	const replaced = rows.find((r) => r.status === "published") ?? null;
	const [{ n } = { n: 0 }] = await db
		.select({ n: count() })
		.from(schema.enrollment)
		.where(
			and(
				eq(schema.enrollment.courseId, courseId),
				eq(schema.enrollment.status, "in_progress"),
			),
		);
	return {
		ok: true,
		impact: {
			replaces: replaced && { id: replaced.id, key: replaced.key },
			learnersInProgress: n,
			summary: replaced
				? updateSummary(
						diffContent(replaced.content, revision.content),
						"major",
					)
				: null,
		},
	};
}

/** Only revisions that were never published can go away: the others are history. */
export async function deleteRevision(
	courseId: string,
	revisionId: string,
): Promise<Outcome<{ key: string }>> {
	return db.transaction(async (tx) => {
		await lockCourse(tx, courseId);
		const [revision] = await tx
			.select()
			.from(courseRevision)
			.where(
				and(
					eq(courseRevision.courseId, courseId),
					eq(courseRevision.id, revisionId),
				),
			);
		if (!revision)
			return { ok: false, status: 404, error: "Revision not found" };
		if (revision.status !== "draft" && revision.status !== "preview")
			return {
				ok: false,
				status: 409,
				error: "Only a draft or preview revision can be deleted",
			};
		await tx.delete(courseRevision).where(eq(courseRevision.id, revision.id));
		return { ok: true, key: revision.key };
	});
}

/**
 * Saves the lessons of a draft. `expectedUpdatedAt` is the `updatedAt` the editor loaded: when somebody saved
 * (or changed the status) since, the save is refused instead of silently overwriting their work.
 */
export async function saveContent(
	courseId: string,
	revisionId: string,
	content: CourseContent,
	expectedUpdatedAt: string,
	actor: CourseActor,
): Promise<Outcome<Record<never, never>>> {
	return db.transaction(async (tx) => {
		const [revision] = await tx
			.select()
			.from(courseRevision)
			.where(
				and(
					eq(courseRevision.courseId, courseId),
					eq(courseRevision.id, revisionId),
				),
			)
			.for("update");
		if (!revision)
			return { ok: false, status: 404, error: "Revision not found" };
		if (!isEditable(revision.status))
			return {
				ok: false,
				status: 409,
				error:
					"Only a draft or a revision in review can be edited: clone this revision to change it",
			};
		if (revision.updatedAt.getTime() !== new Date(expectedUpdatedAt).getTime())
			return {
				ok: false,
				status: 409,
				code: "STALE",
				error:
					"This revision was modified since you opened it: reload to get the latest version",
			};

		await tx
			.update(courseRevision)
			.set({
				content,
				durationMinutes: courseDurationMinutes(content),
				certifying: content.certifying === true,
			})
			.where(eq(courseRevision.id, revision.id));
		await addContributor(tx, revision.id, actor);
		return { ok: true };
	});
}

/** A revision in preview and its course, for a user who was asked to review it (anybody else gets nothing). */
export async function findReviewForReviewer(
	userId: string,
	revisionId: string,
) {
	const [row] = await db
		.select({
			revision: courseRevision,
			course: schema.course,
			reviewer: revisionReviewer,
		})
		.from(revisionReviewer)
		.innerJoin(
			courseRevision,
			eq(courseRevision.id, revisionReviewer.revisionId),
		)
		.innerJoin(course, eq(course.id, courseRevision.courseId))
		.where(
			and(
				eq(revisionReviewer.userId, userId),
				eq(revisionReviewer.revisionId, revisionId),
				eq(courseRevision.status, "preview"),
				isNull(course.deletedAt),
			),
		);
	return (
		row && {
			revision: row.revision,
			course: row.course,
			state: reviewerState(
				{
					verdict: row.reviewer.verdict,
					verdictRevisionUpdatedAt:
						row.reviewer.verdictRevisionUpdatedAt?.getTime() ?? null,
				},
				row.revision.updatedAt.getTime(),
			),
		}
	);
}

/**
 * Records the verdict of a reviewer of a revision in review, remembering which version of the revision it is
 * about (a later change makes it stale).
 */
export async function setVerdict(
	userId: string,
	revisionId: string,
	verdict: ReviewVerdict,
): Promise<Outcome<{ key: string; courseId: string }>> {
	return db.transaction(async (tx) => {
		const [revision] = await tx
			.select()
			.from(courseRevision)
			.where(eq(courseRevision.id, revisionId))
			.for("update");
		if (!revision || revision.status !== "preview")
			return { ok: false, status: 404, error: "Review not found" };
		const updated = await tx
			.update(revisionReviewer)
			.set({
				verdict,
				verdictAt: new Date(),
				verdictRevisionUpdatedAt: revision.updatedAt,
			})
			.where(
				and(
					eq(revisionReviewer.revisionId, revisionId),
					eq(revisionReviewer.userId, userId),
				),
			)
			.returning({ userId: revisionReviewer.userId });
		if (updated.length === 0)
			return { ok: false, status: 404, error: "Review not found" };
		return { ok: true, key: revision.key, courseId: revision.courseId };
	});
}

/** The revisions waiting for this user's review, most recently modified first. */
export async function listMyReviews(userId: string): Promise<MyReview[]> {
	const rows = await db
		.select({ revision: courseRevision, course: schema.course })
		.from(revisionReviewer)
		.innerJoin(
			courseRevision,
			eq(courseRevision.id, revisionReviewer.revisionId),
		)
		.innerJoin(course, eq(course.id, courseRevision.courseId))
		.where(
			and(
				eq(revisionReviewer.userId, userId),
				eq(courseRevision.status, "preview"),
				isNull(course.deletedAt),
			),
		)
		.orderBy(desc(courseRevision.updatedAt), asc(courseRevision.id));
	return rows.map(({ revision, course: c }) => ({
		revisionId: revision.id,
		revisionKey: revision.key,
		purpose: revision.purpose,
		course: { id: c.id, name: c.name, imageAssetId: c.imageAssetId },
		updatedAt: revision.updatedAt.toISOString(),
	}));
}

/**
 * What a review is compared against: the parent of the revision, when it is published or deprecated. An
 * unpublished parent is somebody's work in progress, which a reviewer holding a link must not see.
 */
export async function findReviewBase(
	revision: Pick<Revision, "courseId" | "parentId">,
): Promise<ReviewBase | null> {
	if (!revision.parentId) return null;
	const [parent] = await db
		.select()
		.from(courseRevision)
		.where(
			and(
				eq(courseRevision.courseId, revision.courseId),
				eq(courseRevision.id, revision.parentId),
				inArray(courseRevision.status, ["published", "deprecated"]),
			),
		);
	return parent
		? { key: parent.key, status: parent.status, content: parent.content }
		: null;
}

/** Adds a reviewer to a revision that is in review. */
export async function addReviewer(
	courseId: string,
	revisionId: string,
	userId: string,
): Promise<Outcome<{ key: string; reviewer: ReviewerRef | null }>> {
	return db.transaction(async (tx) => {
		await lockCourse(tx, courseId);
		const [revision] = await tx
			.select()
			.from(courseRevision)
			.where(
				and(
					eq(courseRevision.courseId, courseId),
					eq(courseRevision.id, revisionId),
				),
			);
		if (!revision)
			return { ok: false, status: 404, error: "Revision not found" };
		if (revision.status !== "preview")
			return {
				ok: false,
				status: 409,
				error: "Reviewers can only be changed while the revision is in review",
			};
		const missing = await missingReviewers(tx, [userId]);
		if (missing)
			return {
				ok: false,
				status: 400,
				code: "UNKNOWN_REVIEWER",
				error: missing,
			};
		const current = await reviewersOf(tx, revisionId);
		if (current.some((r) => r.userId === userId))
			return { ok: true, key: revision.key, reviewer: null };
		if (!normalizeReviewerIds([...current.map((r) => r.userId), userId]))
			return { ok: false, status: 400, error: "Too many reviewers" };
		const { added } = await replaceReviewers(tx, revisionId, [
			...current.map((r) => r.userId),
			userId,
		]);
		return { ok: true, key: revision.key, reviewer: added[0] ?? null };
	});
}

/** Removes a reviewer from a revision that is in review. */
export async function removeReviewer(
	courseId: string,
	revisionId: string,
	userId: string,
): Promise<Outcome<{ key: string; reviewer: ReviewerRef }>> {
	return db.transaction(async (tx) => {
		await lockCourse(tx, courseId);
		const [revision] = await tx
			.select()
			.from(courseRevision)
			.where(
				and(
					eq(courseRevision.courseId, courseId),
					eq(courseRevision.id, revisionId),
				),
			);
		if (!revision)
			return { ok: false, status: 404, error: "Revision not found" };
		if (revision.status !== "preview")
			return {
				ok: false,
				status: 409,
				error: "Reviewers can only be changed while the revision is in review",
			};
		const reviewer = (await reviewersOf(tx, revisionId)).find(
			(r) => r.userId === userId,
		);
		if (!reviewer)
			return { ok: false, status: 404, error: "This user is not a reviewer" };
		const left = await reviewersOf(tx, revisionId);
		const noReviewer = reviewersBlocker(left.length - 1);
		if (noReviewer)
			return { ok: false, status: 409, code: "NO_REVIEWER", error: noReviewer };
		await tx
			.delete(revisionReviewer)
			.where(
				and(
					eq(revisionReviewer.revisionId, revisionId),
					eq(revisionReviewer.userId, userId),
				),
			);
		return { ok: true, key: revision.key, reviewer };
	});
}

/** Active users a writer can pick as reviewers, by name or email (at most 20, minus the ones already chosen). */
export async function searchReviewerCandidates(
	search: string,
	excludeIds: string[],
): Promise<ReviewerRef[]> {
	const pattern = `%${escapeLike(search)}%`;
	return db
		.select({ userId: user.id, name: user.name, email: user.email })
		.from(user)
		.where(
			and(
				eq(user.banned, false),
				search
					? or(ilike(user.name, pattern), ilike(user.email, pattern))
					: undefined,
				excludeIds.length > 0 ? notInArray(user.id, excludeIds) : undefined,
			),
		)
		.orderBy(asc(user.name), asc(user.id))
		.limit(20);
}
