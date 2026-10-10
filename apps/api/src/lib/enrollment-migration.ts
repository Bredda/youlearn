import {
	type ChangeImpact,
	type CourseContent,
	carryOver,
	countImpacts,
	diffContent,
	enrollmentOutcome,
	type UpdateSummary,
	updateSummary,
} from "@youlearn/content";
import { and, db, desc, eq, inArray, ne, schema } from "@youlearn/db";
import { type PublishedRevision, updateLevelFor } from "./enrollment-rules";

const { chapterProgress, courseRevision, enrollment, quizAttempt } = schema;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
/** What the reads need: the database itself or a transaction. */
type Reader = Pick<typeof db, "select">;
type EnrollmentRow = typeof enrollment.$inferSelect;
export type Revision = PublishedRevision & { key: string; purpose: string };

/** What one move from a revision to the one published now did, for the event log and the response. */
export type Migration = {
	fromEnrollmentId: string;
	toEnrollmentId: string;
	userId: string;
	courseId: string;
	fromRevision: { id: string; key: string };
	toRevision: { id: string; key: string };
	level: ChangeImpact;
	/** Moved by a minor publication, not by the learner. */
	automatic: boolean;
	/** Chapters of the new revision by what became of them. */
	kept: number;
	redone: number;
	added: number;
	removed: number;
	/** Nothing was left to do once the changes were applied: the new enrollment is already completed. */
	completed: boolean;
};

/** The details of the `enrollment.migrate` event (revision keys, never ids of other people's data). */
export const migrationMetadata = (migration: Migration) => ({
	courseId: migration.courseId,
	from: migration.fromRevision.key,
	to: migration.toRevision.key,
	level: migration.level,
	automatic: migration.automatic,
	kept: migration.kept,
	redone: migration.redone,
	added: migration.added,
	removed: migration.removed,
	completed: migration.completed,
});

export type MigrateOutcome =
	| { ok: true; migration: Migration; enrollment: EnrollmentRow }
	| {
			ok: false;
			reason: "NOT_FOUND" | "NOT_ACTIVE" | "UP_TO_DATE" | "NOT_AUTOMATIC";
	  };

/** What a batch of moves reads more than once: the revisions of a course and the content of a revision. */
export type MigrationCache = {
	revisions: Map<string, Revision[]>;
	contents: Map<string, CourseContent>;
	summaries: Map<string, UpdateSummary>;
};
export const newMigrationCache = (): MigrationCache => ({
	revisions: new Map(),
	contents: new Map(),
	summaries: new Map(),
});

/** The revisions of a course that were published, the published one and the deprecated ones. */
export async function loadPublishedRevisions(
	tx: Reader,
	courseId: string,
	cache: MigrationCache = newMigrationCache(),
): Promise<Revision[]> {
	const known = cache.revisions.get(courseId);
	if (known) return known;
	const rows = await tx
		.select({
			id: courseRevision.id,
			key: courseRevision.key,
			purpose: courseRevision.purpose,
			status: courseRevision.status,
			updatedAt: courseRevision.updatedAt,
			changeImpact: courseRevision.changeImpact,
		})
		.from(courseRevision)
		.where(
			and(
				eq(courseRevision.courseId, courseId),
				inArray(courseRevision.status, ["published", "deprecated"]),
			),
		);
	cache.revisions.set(courseId, rows);
	return rows;
}

async function contentOf(
	tx: Reader,
	revisionId: string,
	cache: MigrationCache,
): Promise<CourseContent> {
	const known = cache.contents.get(revisionId);
	if (known) return known;
	const [row] = await tx
		.select({ content: courseRevision.content })
		.from(courseRevision)
		.where(eq(courseRevision.id, revisionId));
	if (!row) throw new Error(`Revision ${revisionId} not found`);
	cache.contents.set(revisionId, row.content);
	return row.content;
}

/**
 * What moving from a revision to a newer one does to each chapter, as a learner may see it (no content, no quiz).
 * Computed once per pair of revisions and level when a cache is shared.
 */
export async function buildUpdateSummary(
	tx: Reader,
	fromRevisionId: string,
	toRevisionId: string,
	level: ChangeImpact,
	cache: MigrationCache = newMigrationCache(),
): Promise<UpdateSummary> {
	const key = `${fromRevisionId}>${toRevisionId}>${level}`;
	const known = cache.summaries.get(key);
	if (known) return known;
	const [from, to] = await Promise.all([
		contentOf(tx, fromRevisionId, cache),
		contentOf(tx, toRevisionId, cache),
	]);
	const summary = updateSummary(diffContent(from, to), level);
	cache.summaries.set(key, summary);
	return summary;
}

/**
 * Moves an enrollment in progress to the revision published now. The old enrollment becomes `superseded` and a new
 * one continues it (`previousEnrollmentId`): the chapters the update keeps are copied with their date, and so is the
 * latest passing attempt of the quizzes of those chapters, which is what makes a quiz count as passed. What the update
 * sends back starts again; attempts still open and the failed ones stay with the old enrollment.
 *
 * Runs inside the caller's transaction and locks the old row, like every change to an enrollment, so a chapter
 * finished at the same time is either copied or refused, never lost. `automatic` is for a minor publication: it only
 * applies when every revision since the learner's was minor, and the learner finds a notice to acknowledge.
 */
export async function migrateEnrollment(
	tx: Tx,
	enrollmentId: string,
	options: { automatic: boolean },
	cache: MigrationCache = newMigrationCache(),
): Promise<MigrateOutcome> {
	const [old] = await tx
		.select()
		.from(enrollment)
		.where(eq(enrollment.id, enrollmentId))
		.for("update");
	if (!old) return { ok: false, reason: "NOT_FOUND" };
	if (old.status !== "in_progress") return { ok: false, reason: "NOT_ACTIVE" };

	const revisions = await loadPublishedRevisions(tx, old.courseId, cache);
	const target = revisions.find((revision) => revision.status === "published");
	const level = updateLevelFor(revisions, old.revisionId);
	if (!target || !level || target.id === old.revisionId)
		return { ok: false, reason: "UP_TO_DATE" };
	if (options.automatic && level !== "minor")
		return { ok: false, reason: "NOT_AUTOMATIC" };
	const source = revisions.find((revision) => revision.id === old.revisionId);

	const summary = await buildUpdateSummary(
		tx,
		old.revisionId,
		target.id,
		level,
		cache,
	);

	const [finished, passing] = await Promise.all([
		tx
			.select()
			.from(chapterProgress)
			.where(eq(chapterProgress.enrollmentId, old.id)),
		// Newest first, so the first one met for a chapter is the one to keep.
		tx
			.select()
			.from(quizAttempt)
			.where(
				and(
					eq(quizAttempt.enrollmentId, old.id),
					eq(quizAttempt.passed, true),
					eq(quizAttempt.finalExam, false),
				),
			)
			.orderBy(desc(quizAttempt.submittedAt)),
	]);
	const carried = carryOver(summary, {
		completed: finished.map((row) => row.chapterId),
		passedQuizzes: passing.map((row) => row.chapterId),
	});
	const keptCompleted = new Set(carried.completed);
	const keptPassed = new Set(carried.passedQuizzes);

	const now = new Date();
	// The old one goes first: only one enrollment per learner and course can be live.
	await tx
		.update(enrollment)
		.set({ status: "superseded", finishedAt: now })
		.where(eq(enrollment.id, old.id));
	const [created] = await tx
		.insert(enrollment)
		.values({
			userId: old.userId,
			courseId: old.courseId,
			revisionId: target.id,
			previousEnrollmentId: old.id,
			// The learner has been on this course since they started it, whichever revision they followed.
			startedAt: old.startedAt,
			// A move the learner chose needs no notice; an automatic one does.
			noticeAckedAt: options.automatic ? null : now,
		})
		.returning();
	if (!created) throw new Error("Enrollment was not created");

	const progressToCopy = finished.filter((row) =>
		keptCompleted.has(row.chapterId),
	);
	if (progressToCopy.length > 0)
		await tx.insert(chapterProgress).values(
			progressToCopy.map((row) => ({
				enrollmentId: created.id,
				chapterId: row.chapterId,
				completedAt: row.completedAt,
			})),
		);
	const attemptsToCopy = new Map<string, (typeof passing)[number]>();
	for (const attempt of passing)
		if (
			keptPassed.has(attempt.chapterId) &&
			!attemptsToCopy.has(attempt.chapterId)
		)
			attemptsToCopy.set(attempt.chapterId, attempt);
	if (attemptsToCopy.size > 0)
		await tx.insert(quizAttempt).values(
			[...attemptsToCopy.values()].map((attempt) => ({
				enrollmentId: created.id,
				chapterId: attempt.chapterId,
				finalExam: false,
				draw: attempt.draw,
				answers: attempt.answers,
				score: attempt.score,
				passed: attempt.passed,
				startedAt: attempt.startedAt,
				submittedAt: attempt.submittedAt,
			})),
		);

	// An update can remove the only chapters left to do.
	const completed =
		enrollmentOutcome(await contentOf(tx, target.id, cache), keptCompleted) ===
		"completed";
	let result = created;
	if (completed) {
		const [updated] = await tx
			.update(enrollment)
			.set({ status: "completed", finishedAt: now })
			.where(eq(enrollment.id, created.id))
			.returning();
		if (updated) result = updated;
	}

	const counts = countImpacts(summary);
	return {
		ok: true,
		enrollment: result,
		migration: {
			fromEnrollmentId: old.id,
			toEnrollmentId: created.id,
			userId: old.userId,
			courseId: old.courseId,
			fromRevision: { id: old.revisionId, key: source?.key ?? "" },
			toRevision: { id: target.id, key: target.key },
			level,
			automatic: options.automatic,
			kept: counts.kept,
			redone: counts.redo,
			added: counts.added,
			removed: counts.removed,
			completed,
		},
	};
}

/**
 * Moves every learner in progress on a course that a minor publication lets move by itself. Runs in the publication's
 * transaction; each move has its own savepoint, so one that fails leaves that learner on their revision (they can still
 * choose to move) instead of blocking the publication.
 */
export async function migrateEligible(
	tx: Tx,
	courseId: string,
	publishedRevisionId: string,
): Promise<{ migrations: Migration[]; failed: string[] }> {
	const waiting = await tx
		.select({ id: enrollment.id })
		.from(enrollment)
		.where(
			and(
				eq(enrollment.courseId, courseId),
				eq(enrollment.status, "in_progress"),
				ne(enrollment.revisionId, publishedRevisionId),
			),
		);
	const cache = newMigrationCache();
	const migrations: Migration[] = [];
	const failed: string[] = [];
	for (const { id } of waiting) {
		try {
			const outcome = await tx.transaction((savepoint) =>
				migrateEnrollment(savepoint, id, { automatic: true }, cache),
			);
			if (outcome.ok) migrations.push(outcome.migration);
		} catch {
			failed.push(id);
		}
	}
	return { migrations, failed };
}
