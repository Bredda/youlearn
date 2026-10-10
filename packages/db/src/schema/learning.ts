import { randomUUID } from "node:crypto";
import type { QuizAnswers, QuizDraw } from "@youlearn/content";
import { sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { course, courseRevision } from "./courses";

export const enrollmentStatus = pgEnum("enrollment_status", [
	"in_progress",
	"completed",
	"failed",
	"superseded",
]);

/**
 * A learner following a course. It pins the revision published at enrollment time (`revisionId`), which a later
 * publication never changes: progress and the future certificate refer to what was actually followed. A failed
 * enrollment (final exam missed) stays as history and the learner starts over with a new one.
 *
 * Moving to a newer revision does not move the enrollment: it creates a new one that points back at the old one
 * (`previousEnrollmentId`), which becomes `superseded` and stays as history. A superseded enrollment is never
 * listed on its own: its successor is the learner's current enrollment.
 */
export const enrollment = pgTable(
	"enrollment",
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		courseId: text()
			.notNull()
			.references(() => course.id, { onDelete: "cascade" }),
		revisionId: text()
			.notNull()
			.references(() => courseRevision.id, { onDelete: "restrict" }),
		status: enrollmentStatus().notNull().default("in_progress"),
		startedAt: timestamp().notNull().defaultNow(),
		/** Set when the status leaves `in_progress`. */
		finishedAt: timestamp(),
		/** The enrollment this one continues after a move to a newer revision. */
		previousEnrollmentId: text().references((): AnyPgColumn => enrollment.id, {
			onDelete: "set null",
		}),
		/**
		 * The published revision whose update the learner chose to postpone: the offer does not open by itself again
		 * until another revision is published.
		 */
		updatePostponedRevisionId: text().references(() => courseRevision.id, {
			onDelete: "set null",
		}),
		/**
		 * When the learner saw the notice of an automatic move to a newer revision. Null on such an enrollment means
		 * the notice is still pending; a move the learner chose themselves is created already acknowledged.
		 */
		noticeAckedAt: timestamp(),
		createdAt: timestamp().notNull().defaultNow(),
		updatedAt: timestamp()
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		// One enrollment per learner and course, except the ones kept as history (failed, superseded). Written with the
		// values the enum already had: Postgres refuses to use a value in the transaction that adds it.
		uniqueIndex("enrollment_active_idx")
			.on(table.userId, table.courseId)
			.where(sql`${table.status} in ('in_progress', 'completed')`),
		index("enrollment_course_id_idx").on(table.courseId),
		index("enrollment_revision_id_idx").on(table.revisionId),
	],
);

/** A chapter the learner has finished. Chapter ids are stable in the content, so they identify the chapter. */
export const chapterProgress = pgTable(
	"chapter_progress",
	{
		enrollmentId: text()
			.notNull()
			.references(() => enrollment.id, { onDelete: "cascade" }),
		chapterId: text().notNull(),
		completedAt: timestamp().notNull().defaultNow(),
	},
	(table) => [primaryKey({ columns: [table.enrollmentId, table.chapterId] })],
);

/**
 * One try at the quiz of a chapter. The server draws the questions when the attempt starts and keeps the draw, so
 * a resumed attempt is identical and grading never trusts the client. A final exam allows one attempt per
 * enrollment, enforced by the partial unique index.
 */
export const quizAttempt = pgTable(
	"quiz_attempt",
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		enrollmentId: text()
			.notNull()
			.references(() => enrollment.id, { onDelete: "cascade" }),
		chapterId: text().notNull(),
		finalExam: boolean().notNull().default(false),
		draw: jsonb().$type<QuizDraw>().notNull(),
		/** Null until submitted. */
		answers: jsonb().$type<QuizAnswers>(),
		/** Percentage of right questions, null until submitted. */
		score: integer(),
		passed: boolean(),
		startedAt: timestamp().notNull().defaultNow(),
		submittedAt: timestamp(),
	},
	(table) => [
		index("quiz_attempt_enrollment_chapter_idx").on(
			table.enrollmentId,
			table.chapterId,
		),
		uniqueIndex("quiz_attempt_final_exam_idx")
			.on(table.enrollmentId)
			.where(sql`${table.finalExam}`),
	],
);
