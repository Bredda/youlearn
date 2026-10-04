import { randomUUID } from "node:crypto";
import type { QuizAnswers, QuizDraw } from "@youlearn/content";
import { sql } from "drizzle-orm";
import {
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
]);

/**
 * A learner following a course. It pins the revision published at enrollment time (`revisionId`), which a later
 * publication never changes: progress and the future certificate refer to what was actually followed. A failed
 * enrollment (final exam missed) stays as history and the learner starts over with a new one.
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
		createdAt: timestamp().notNull().defaultNow(),
		updatedAt: timestamp()
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		// One enrollment per learner and course, except the failed ones (history).
		uniqueIndex("enrollment_active_idx")
			.on(table.userId, table.courseId)
			.where(sql`${table.status} <> 'failed'`),
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
