import {
	answersIssue,
	type CompleteRefusal,
	canCompleteChapter,
	chapterStates,
	drawQuiz,
	enrollmentOutcome,
	gradeAttempt,
	learnerQuestions,
	type Progress,
	type QuizAnswers,
	toLearnerContent,
} from "@youlearn/content";
import { and, asc, db, desc, eq, inArray, isNull, schema } from "@youlearn/db";
import type {
	AttemptResult,
	AttemptSummary,
	EnrollmentStatus,
	EnrollmentView,
	LearnerAttempt,
	LearnerCourse,
	LearnerEnrollment,
	LearnerRevision,
} from "@youlearn/types";
import { visibleTo } from "./catalog";
import { type CourseActor, canViewCourse, findCourse } from "./courses";
import { finalExamScore } from "./enrollments";
import { isUniqueViolation } from "./groups";

const { chapterProgress, course, courseRevision, enrollment, quizAttempt } =
	schema;

type EnrollmentRow = typeof enrollment.$inferSelect;

const toLearnerEnrollment = (
	row: EnrollmentRow,
	revisionKey: string,
	/** The revision published now, if any. */
	currentRevisionId: string | undefined,
	finalExamScore: number | null,
): LearnerEnrollment => ({
	id: row.id,
	status: row.status,
	revisionKey,
	startedAt: row.startedAt.toISOString(),
	finishedAt: row.finishedAt?.toISOString() ?? null,
	finalExamScore,
	outdated:
		currentRevisionId !== undefined && currentRevisionId !== row.revisionId,
});

/** The course and its published revision, when the learner may open it (same rule as the catalog). */
async function findPublished(actor: CourseActor, courseId: string) {
	const [row] = await db
		.select({
			id: course.id,
			name: course.name,
			description: course.description,
			categories: course.categories,
			imageAssetId: course.imageAssetId,
			revisionId: courseRevision.id,
			revisionKey: courseRevision.key,
			publishedAt: courseRevision.updatedAt,
			durationMinutes: courseRevision.durationMinutes,
			certifying: courseRevision.certifying,
			content: courseRevision.content,
		})
		.from(course)
		.innerJoin(
			courseRevision,
			and(
				eq(courseRevision.courseId, course.id),
				eq(courseRevision.status, "published"),
			),
		)
		.where(and(eq(course.id, courseId), visibleTo(actor)));
	return row;
}

/** The learner's latest enrollment on a course, a failed one included. */
async function findLatestEnrollment(userId: string, courseId: string) {
	const [row] = await db
		.select({
			enrollment,
			revisionKey: courseRevision.key,
			finalExamScore,
		})
		.from(enrollment)
		.innerJoin(courseRevision, eq(courseRevision.id, enrollment.revisionId))
		.where(
			and(eq(enrollment.userId, userId), eq(enrollment.courseId, courseId)),
		)
		.orderBy(desc(enrollment.startedAt))
		.limit(1);
	return row;
}

/** The sheet of a published course for a learner, with their enrollment. Undefined when they cannot see it. */
export async function findLearnerCourse(
	actor: CourseActor,
	courseId: string,
): Promise<LearnerCourse | undefined> {
	const published = await findPublished(actor, courseId);
	if (!published) return undefined;
	const [latest, revisions, followed] = await Promise.all([
		findLatestEnrollment(actor.id, courseId),
		// Only what was published: a draft or a revision in review is somebody's unfinished work. Deprecating bumps
		// `updatedAt` and only one revision is published at a time, so this is the publication order.
		db
			.select({
				id: courseRevision.id,
				key: courseRevision.key,
				status: courseRevision.status,
				purpose: courseRevision.purpose,
			})
			.from(courseRevision)
			.where(
				and(
					eq(courseRevision.courseId, courseId),
					inArray(courseRevision.status, ["published", "deprecated"]),
				),
			)
			.orderBy(desc(courseRevision.updatedAt)),
		db
			.select({
				revisionId: enrollment.revisionId,
				status: enrollment.status,
			})
			.from(enrollment)
			.where(
				and(eq(enrollment.userId, actor.id), eq(enrollment.courseId, courseId)),
			)
			.orderBy(desc(enrollment.startedAt)),
	]);
	// The latest enrollment of the learner on each revision (the list is newest first).
	const enrollmentOf = new Map<string, EnrollmentStatus>();
	for (const entry of followed)
		if (!enrollmentOf.has(entry.revisionId))
			enrollmentOf.set(entry.revisionId, entry.status);
	const { content, revisionId, revisionKey, publishedAt, ...rest } = published;
	return {
		...rest,
		revisionKey,
		revisions: revisions.map(
			(revision): LearnerRevision => ({
				key: revision.key,
				status: revision.status === "published" ? "published" : "deprecated",
				purpose: revision.purpose,
				enrollmentStatus: enrollmentOf.get(revision.id) ?? null,
			}),
		),
		publishedAt: publishedAt.toISOString(),
		chapters: content.chapters.map((chapter) => ({
			id: chapter.id,
			title: chapter.title,
			kind: chapter.kind ?? "standard",
			estimatedMinutes: chapter.estimatedMinutes ?? null,
		})),
		enrollment: latest
			? toLearnerEnrollment(
					latest.enrollment,
					latest.revisionKey,
					revisionId,
					latest.finalExamScore,
				)
			: null,
	};
}

export type StartResult =
	| {
			ok: true;
			enrollment: LearnerEnrollment;
			courseName: string;
			/** Starts over after a failed enrollment. */
			restart: boolean;
	  }
	| { ok: false; reason: "NOT_FOUND" | "ALREADY_ENROLLED" };

/** Enrolls the learner on the revision published now, which they will follow from then on. */
export async function startEnrollment(
	actor: CourseActor,
	courseId: string,
): Promise<StartResult> {
	const published = await findPublished(actor, courseId);
	if (!published) return { ok: false, reason: "NOT_FOUND" };

	const failedBefore = await db.$count(
		enrollment,
		and(
			eq(enrollment.userId, actor.id),
			eq(enrollment.courseId, courseId),
			eq(enrollment.status, "failed"),
		),
	);
	try {
		const [created] = await db
			.insert(enrollment)
			.values({
				userId: actor.id,
				courseId,
				revisionId: published.revisionId,
			})
			.returning();
		if (!created) throw new Error("Enrollment was not created");
		return {
			ok: true,
			enrollment: toLearnerEnrollment(
				created,
				published.revisionKey,
				published.revisionId,
				null,
			),
			courseName: published.name,
			restart: failedBefore > 0,
		};
	} catch (error) {
		// The partial unique index: a non failed enrollment already exists.
		if (isUniqueViolation(error))
			return { ok: false, reason: "ALREADY_ENROLLED" };
		throw error;
	}
}

/**
 * The enrollment of `actor` with its course and pinned revision (whatever its status now). Only its owner gets it,
 * and only while they still see the course: groups can change and the course can be archived.
 */
async function findOwned(actor: CourseActor, enrollmentId: string) {
	const [row] = await db
		.select({ enrollment, course, revision: courseRevision })
		.from(enrollment)
		.innerJoin(course, eq(course.id, enrollment.courseId))
		.innerJoin(courseRevision, eq(courseRevision.id, enrollment.revisionId))
		.where(
			and(
				eq(enrollment.id, enrollmentId),
				eq(enrollment.userId, actor.id),
				isNull(course.deletedAt),
			),
		);
	if (!row) return undefined;
	const target = await findCourse(row.course.id);
	return target && canViewCourse(actor, target) ? row : undefined;
}

type Executor = Pick<typeof db, "select" | "selectDistinct">;

/** The chapters the learner finished and those whose quiz they passed. */
async function loadProgress(
	executor: Executor,
	enrollmentId: string,
): Promise<Progress> {
	const [done, passed] = await Promise.all([
		executor
			.select({ chapterId: chapterProgress.chapterId })
			.from(chapterProgress)
			.where(eq(chapterProgress.enrollmentId, enrollmentId)),
		executor
			.selectDistinct({ chapterId: quizAttempt.chapterId })
			.from(quizAttempt)
			.where(
				and(
					eq(quizAttempt.enrollmentId, enrollmentId),
					eq(quizAttempt.passed, true),
				),
			),
	]);
	return {
		completed: new Set(done.map((row) => row.chapterId)),
		passedQuizzes: new Set(passed.map((row) => row.chapterId)),
	};
}

/** The player of an enrollment: the pinned revision, without any quiz question, and where the learner stands. */
export async function findEnrollmentView(
	actor: CourseActor,
	enrollmentId: string,
): Promise<EnrollmentView | undefined> {
	const row = await findOwned(actor, enrollmentId);
	if (!row) return undefined;

	const [current] = await db
		.select({ id: courseRevision.id })
		.from(courseRevision)
		.where(
			and(
				eq(courseRevision.courseId, row.course.id),
				eq(courseRevision.status, "published"),
			),
		);
	const [progress, attempts] = await Promise.all([
		loadProgress(db, enrollmentId),
		db
			.select()
			.from(quizAttempt)
			.where(eq(quizAttempt.enrollmentId, enrollmentId))
			.orderBy(asc(quizAttempt.startedAt)),
	]);
	const chapterStatesById = chapterStates(row.revision.content, progress);
	const learnerContent = toLearnerContent(row.revision.content);
	return {
		enrollment: toLearnerEnrollment(
			row.enrollment,
			row.revision.key,
			current?.id,
			attempts.find((attempt) => attempt.finalExam)?.score ?? null,
		),
		course: {
			id: row.course.id,
			name: row.course.name,
			description: row.course.description,
			categories: row.course.categories,
			imageAssetId: row.course.imageAssetId,
		},
		revision: {
			id: row.revision.id,
			key: row.revision.key,
			durationMinutes: row.revision.durationMinutes,
			certifying: row.revision.certifying,
		},
		content: {
			...learnerContent,
			// A locked chapter is not sent: the server, not the page, decides what the learner may read yet.
			chapters: learnerContent.chapters.map((chapter) =>
				chapterStatesById[chapter.id] === "locked"
					? { ...chapter, blocks: [] }
					: chapter,
			),
		},
		chapterStates: chapterStatesById,
		passedQuizzes: [...progress.passedQuizzes],
		attempts: attempts.map(
			(attempt): AttemptSummary => ({
				id: attempt.id,
				chapterId: attempt.chapterId,
				finalExam: attempt.finalExam,
				score: attempt.score,
				passed: attempt.passed,
				startedAt: attempt.startedAt.toISOString(),
				submittedAt: attempt.submittedAt?.toISOString() ?? null,
			}),
		),
	};
}

export type CompleteResult =
	| {
			ok: true;
			/** This call completed the whole course. */
			finished: boolean;
			courseName: string;
			revisionKey: string;
			courseId: string;
	  }
	| { ok: false; reason: "NOT_FOUND" | "NOT_ACTIVE" | CompleteRefusal };

/**
 * The learner marks a chapter as finished. The enrollment row is locked so two requests cannot both decide the
 * course is finished; finishing the last chapter of a course without final exam completes the enrollment.
 */
export async function completeChapter(
	actor: CourseActor,
	enrollmentId: string,
	chapterId: string,
): Promise<CompleteResult> {
	const owned = await findOwned(actor, enrollmentId);
	if (!owned) return { ok: false, reason: "NOT_FOUND" };
	const content = owned.revision.content;

	return db.transaction(async (tx): Promise<CompleteResult> => {
		const [current] = await tx
			.select({ status: enrollment.status })
			.from(enrollment)
			.where(eq(enrollment.id, enrollmentId))
			.for("update");
		if (current?.status !== "in_progress")
			return { ok: false, reason: "NOT_ACTIVE" };

		const progress = await loadProgress(tx, enrollmentId);
		const allowed = canCompleteChapter(content, chapterId, progress);
		if (!allowed.ok) return { ok: false, reason: allowed.reason };

		await tx
			.insert(chapterProgress)
			.values({ enrollmentId, chapterId })
			.onConflictDoNothing();
		const completed = new Set([...progress.completed, chapterId]);
		const finished =
			enrollmentOutcome(content, completed) === "completed" &&
			// A repeated call on a finished chapter must not complete twice.
			!progress.completed.has(chapterId);
		if (finished)
			await tx
				.update(enrollment)
				.set({ status: "completed", finishedAt: new Date() })
				.where(eq(enrollment.id, enrollmentId));
		return {
			ok: true,
			finished,
			courseName: owned.course.name,
			revisionKey: owned.revision.key,
			courseId: owned.course.id,
		};
	});
}

export type StartAttemptResult =
	| { ok: true; attempt: LearnerAttempt }
	| {
			ok: false;
			reason:
				| "NOT_FOUND"
				| "NOT_ACTIVE"
				| "UNKNOWN_CHAPTER"
				| "NO_QUIZ"
				| "LOCKED"
				| "EXAM_ALREADY_TAKEN";
	  };

/**
 * Starts an attempt at the quiz of a chapter, or resumes the one still open (same questions, same order). The
 * server draws the questions and keeps the draw. The final exam has a single attempt per enrollment.
 */
export async function startAttempt(
	actor: CourseActor,
	enrollmentId: string,
	chapterId: string,
): Promise<StartAttemptResult> {
	const owned = await findOwned(actor, enrollmentId);
	if (!owned) return { ok: false, reason: "NOT_FOUND" };
	const content = owned.revision.content;
	const chapter = content.chapters.find((c) => c.id === chapterId);
	if (!chapter) return { ok: false, reason: "UNKNOWN_CHAPTER" };
	const quiz = chapter.quiz;
	if (!quiz) return { ok: false, reason: "NO_QUIZ" };
	const finalExam = chapter.kind === "final-exam";

	return db.transaction(async (tx): Promise<StartAttemptResult> => {
		const [current] = await tx
			.select({ status: enrollment.status })
			.from(enrollment)
			.where(eq(enrollment.id, enrollmentId))
			.for("update");
		if (current?.status !== "in_progress")
			return { ok: false, reason: "NOT_ACTIVE" };

		const progress = await loadProgress(tx, enrollmentId);
		if (chapterStates(content, progress)[chapterId] === "locked")
			return { ok: false, reason: "LOCKED" };

		const attempts = await tx
			.select()
			.from(quizAttempt)
			.where(
				and(
					eq(quizAttempt.enrollmentId, enrollmentId),
					eq(quizAttempt.chapterId, chapterId),
				),
			);
		const open = attempts.find((attempt) => attempt.submittedAt === null);
		if (!open && finalExam && attempts.length > 0)
			return { ok: false, reason: "EXAM_ALREADY_TAKEN" };

		const attempt =
			open ??
			(
				await tx
					.insert(quizAttempt)
					.values({
						enrollmentId,
						chapterId,
						finalExam,
						draw: drawQuiz(quiz),
					})
					.returning()
			)[0];
		if (!attempt) throw new Error("Attempt was not created");
		return {
			ok: true,
			attempt: {
				id: attempt.id,
				chapterId,
				finalExam,
				questions: learnerQuestions(quiz, attempt.draw),
			},
		};
	});
}

export type SubmitAttemptResult =
	| {
			ok: true;
			result: AttemptResult;
			/** The final exam was just passed or failed: the enrollment ended. */
			ended: "completed" | "failed" | null;
			courseId: string;
			courseName: string;
			revisionKey: string;
	  }
	| {
			ok: false;
			reason: "NOT_FOUND" | "NOT_ACTIVE" | "ALREADY_SUBMITTED";
	  }
	| { ok: false; reason: "INVALID_ANSWERS"; message: string };

/**
 * Grades an attempt on the server. A chapter quiz returns the correction; the final exam returns the score only
 * and ends the enrollment: passed completes it, failed marks it `failed` (the learner starts over with a new one).
 */
export async function submitAttempt(
	actor: CourseActor,
	enrollmentId: string,
	attemptId: string,
	answers: QuizAnswers,
): Promise<SubmitAttemptResult> {
	const owned = await findOwned(actor, enrollmentId);
	if (!owned) return { ok: false, reason: "NOT_FOUND" };
	const content = owned.revision.content;

	return db.transaction(async (tx): Promise<SubmitAttemptResult> => {
		const [current] = await tx
			.select({ status: enrollment.status })
			.from(enrollment)
			.where(eq(enrollment.id, enrollmentId))
			.for("update");
		if (current?.status !== "in_progress")
			return { ok: false, reason: "NOT_ACTIVE" };

		const [attempt] = await tx
			.select()
			.from(quizAttempt)
			.where(
				and(
					eq(quizAttempt.id, attemptId),
					eq(quizAttempt.enrollmentId, enrollmentId),
				),
			);
		const quiz = content.chapters.find(
			(c) => c.id === attempt?.chapterId,
		)?.quiz;
		if (!attempt || !quiz) return { ok: false, reason: "NOT_FOUND" };
		if (attempt.submittedAt) return { ok: false, reason: "ALREADY_SUBMITTED" };

		const issue = answersIssue(quiz, attempt.draw, answers);
		if (issue) return { ok: false, reason: "INVALID_ANSWERS", message: issue };

		const grade = gradeAttempt(quiz, attempt.draw, answers);
		await tx
			.update(quizAttempt)
			.set({
				answers,
				score: grade.score,
				passed: grade.passed,
				submittedAt: new Date(),
			})
			.where(eq(quizAttempt.id, attemptId));

		let status: "in_progress" | "completed" | "failed" = "in_progress";
		if (attempt.finalExam) {
			if (grade.passed) {
				await tx
					.insert(chapterProgress)
					.values({ enrollmentId, chapterId: attempt.chapterId })
					.onConflictDoNothing();
				const progress = await loadProgress(tx, enrollmentId);
				status = enrollmentOutcome(content, progress.completed);
			} else status = "failed";
			if (status !== "in_progress")
				await tx
					.update(enrollment)
					.set({ status, finishedAt: new Date() })
					.where(eq(enrollment.id, enrollmentId));
		}
		return {
			ok: true,
			result: {
				score: grade.score,
				passed: grade.passed,
				passRate: quiz.passRate,
				// The final exam never shows its correction: the pool would leak a little more at every try.
				corrections: attempt.finalExam ? null : grade.corrections,
				enrollmentStatus: status,
			},
			ended: status === "in_progress" ? null : status,
			courseId: owned.course.id,
			courseName: owned.course.name,
			revisionKey: owned.revision.key,
		};
	});
}
