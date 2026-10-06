import { randomBytes } from "node:crypto";
import { courseDurationMinutes } from "@youlearn/content";
import {
	and,
	asc,
	db,
	eq,
	ilike,
	inArray,
	isNull,
	notInArray,
	or,
	schema,
} from "@youlearn/db";
import type {
	CourseContent,
	ReviewBase,
	ReviewerRef,
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
	isEditable,
	normalizeReviewerIds,
	openRevisionBlocker,
	previewBlocker,
	TRANSITIONS,
} from "./revision-rules";
import { escapeLike } from "./sql";

const { course, courseRevision, revisionContributor, revisionReviewer, user } =
	schema;

/** Secret of a review link (256 bits, URL-safe). */
const newPreviewToken = () => randomBytes(32).toString("base64url");

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
	return rows.map((row) => ({
		id: row.id,
		courseId: row.courseId,
		key: row.key,
		status: row.status,
		parentId: row.parentId,
		previewToken: row.previewToken,
		purpose: row.purpose,
		durationMinutes: row.durationMinutes,
		certifying: row.certifying,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		contributors: contributors
			.filter((c) => c.revisionId === row.id)
			.map((c) => ({ userId: c.userId, name: c.userLabel })),
		reviewers: reviewers
			.filter((r) => r.revisionId === row.id)
			.map(({ userId, name, email }) => ({ userId, name, email })),
	}));
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

export type Failure = { error: string; status: 400 | 404 | 409; code?: string };
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
): Promise<
	Outcome<{
		from: RevisionStatus;
		key: string;
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

		if (deprecated && !confirm)
			return {
				ok: false,
				status: 409,
				code: "CONFIRM_REQUIRED",
				error: `Revision ${deprecated.key} will be deprecated: confirmation required`,
			};

		// The old published revision goes first: only one revision can hold the status at a time.
		if (to === "published" && deprecated)
			await tx
				.update(courseRevision)
				.set({ status: "deprecated" })
				.where(eq(courseRevision.id, deprecated.id));
		// The review link lives exactly as long as the revision stays in preview.
		await tx
			.update(courseRevision)
			.set({
				status: to,
				previewToken: to === "preview" ? newPreviewToken() : null,
			})
			.where(eq(courseRevision.id, revision.id));

		const reviewers = wanted
			? await replaceReviewers(tx, revision.id, wanted)
			: { added: [], removed: [] };

		return {
			ok: true,
			from: revision.status,
			key: revision.key,
			reviewers,
			deprecated:
				to === "published" && deprecated
					? { id: deprecated.id, key: deprecated.key }
					: null,
		};
	});
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

/** Replaces (or, with `revoke`, removes) the review link of a revision in preview. */
export async function resetPreviewToken(
	courseId: string,
	revisionId: string,
	revoke: boolean,
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
		if (revision.status !== "preview")
			return {
				ok: false,
				status: 409,
				error: "Only a revision in preview has a review link",
			};
		await tx
			.update(courseRevision)
			.set({ previewToken: revoke ? null : newPreviewToken() })
			.where(eq(courseRevision.id, revision.id));
		return { ok: true, key: revision.key };
	});
}

/** The revision a review link points to, as long as that revision is still in preview. */
export async function findRevisionByToken(token: string) {
	const [row] = await db
		.select({
			revision: courseRevision,
			course: schema.course,
		})
		.from(courseRevision)
		.innerJoin(course, eq(course.id, courseRevision.courseId))
		.where(
			and(
				eq(courseRevision.previewToken, token),
				eq(courseRevision.status, "preview"),
				isNull(course.deletedAt),
			),
		);
	return row;
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
