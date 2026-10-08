import { type ReviewTarget, reviewTargetExists } from "@youlearn/content";
import { and, asc, db, eq, isNull, schema } from "@youlearn/db";
import type { ReviewThread } from "@youlearn/types";
import { type CourseActor, canEditCourse } from "./course-rules";
import { findCourse } from "./courses";

const { courseRevision, reviewComment, revisionReviewer } = schema;

type Revision = typeof courseRevision.$inferSelect;
type Comment = typeof reviewComment.$inferSelect;
type Actor = CourseActor;

export type Failure = { error: string; status: 400 | 404 };
type Outcome<T> = ({ ok: true } & T) | ({ ok: false } & Failure);

/**
 * The revision whose remarks the actor may use: its reviewers (while it is in review) and the editors of the
 * course. Editors read the remarks of any status (they stay as history) but, like reviewers, write them only
 * while the revision is in review. Anybody else gets nothing (404).
 */
export async function findCommentAccess(actor: Actor, revisionId: string) {
	const [revision] = await db
		.select()
		.from(courseRevision)
		.where(eq(courseRevision.id, revisionId));
	if (!revision) return undefined;
	const course = await findCourse(revision.courseId);
	if (!course) return undefined;

	const inReview = revision.status === "preview";
	const reviewer =
		inReview &&
		(await db.$count(
			revisionReviewer,
			and(
				eq(revisionReviewer.revisionId, revision.id),
				eq(revisionReviewer.userId, actor.id),
			),
		)) > 0;
	if (!reviewer && !canEditCourse(actor, course)) return undefined;
	return { revision, canWrite: inReview };
}

function targetOf(root: Comment): ReviewTarget {
	switch (root.targetType) {
		case "chapter":
			return { type: "chapter", chapterId: root.chapterId ?? "" };
		case "block":
		case "question":
			return {
				type: root.targetType,
				chapterId: root.chapterId ?? "",
				itemId: root.itemId ?? "",
			};
		default:
			return { type: "revision" };
	}
}

/** The threads of a revision, oldest first, each flagged when its element no longer exists in the content. */
export async function listThreads(revision: Revision): Promise<ReviewThread[]> {
	const rows = await db
		.select()
		.from(reviewComment)
		.where(eq(reviewComment.revisionId, revision.id))
		.orderBy(asc(reviewComment.createdAt), asc(reviewComment.id));
	const toComment = (row: Comment) => ({
		id: row.id,
		authorId: row.authorId,
		author: row.authorLabel,
		body: row.body,
		createdAt: row.createdAt.toISOString(),
	});
	return rows
		.filter((row) => row.parentId === null)
		.map((root) => {
			const target = targetOf(root);
			return {
				id: root.id,
				target,
				quote: root.quote,
				status: root.status,
				resolvedBy: root.resolvedByLabel,
				resolvedAt: root.resolvedAt?.toISOString() ?? null,
				orphaned: !reviewTargetExists(revision.content, target),
				comments: [
					toComment(root),
					...rows.filter((r) => r.parentId === root.id).map(toComment),
				],
			};
		});
}

/** Starts a thread on an element that exists in the revision. */
export async function createThread(
	revision: Revision,
	actor: Actor,
	input: { target: ReviewTarget; quote?: string | undefined; body: string },
): Promise<Outcome<Record<never, never>>> {
	if (!reviewTargetExists(revision.content, input.target))
		return {
			ok: false,
			status: 400,
			error: "This element is not in the revision",
		};
	const { target } = input;
	await db.insert(reviewComment).values({
		revisionId: revision.id,
		targetType: target.type,
		chapterId: "chapterId" in target ? target.chapterId : null,
		itemId: "itemId" in target ? target.itemId : null,
		quote: input.quote || null,
		body: input.body,
		authorId: actor.id,
		authorLabel: actor.name,
	});
	return { ok: true };
}

/** Answers a thread of the revision. */
export async function createReply(
	revision: Revision,
	actor: Actor,
	parentId: string,
	body: string,
): Promise<Outcome<Record<never, never>>> {
	const [root] = await db
		.select({ id: reviewComment.id })
		.from(reviewComment)
		.where(
			and(
				eq(reviewComment.id, parentId),
				eq(reviewComment.revisionId, revision.id),
				isNull(reviewComment.parentId),
			),
		);
	if (!root) return { ok: false, status: 404, error: "Thread not found" };
	await db.insert(reviewComment).values({
		revisionId: revision.id,
		parentId,
		body,
		authorId: actor.id,
		authorLabel: actor.name,
	});
	return { ok: true };
}

/** Marks a thread as dealt with, or reopens it. */
export async function setThreadStatus(
	revision: Revision,
	actor: Actor,
	threadId: string,
	status: "open" | "resolved",
): Promise<Outcome<Record<never, never>>> {
	const updated = await db
		.update(reviewComment)
		.set(
			status === "resolved"
				? {
						status,
						resolvedById: actor.id,
						resolvedByLabel: actor.name,
						resolvedAt: new Date(),
					}
				: {
						status,
						resolvedById: null,
						resolvedByLabel: null,
						resolvedAt: null,
					},
		)
		.where(
			and(
				eq(reviewComment.id, threadId),
				eq(reviewComment.revisionId, revision.id),
				isNull(reviewComment.parentId),
			),
		)
		.returning({ id: reviewComment.id });
	return updated.length > 0
		? { ok: true }
		: { ok: false, status: 404, error: "Thread not found" };
}
