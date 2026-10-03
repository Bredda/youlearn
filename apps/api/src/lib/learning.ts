import {
	type CompleteRefusal,
	canCompleteChapter,
	chapterStates,
	enrollmentOutcome,
	type Progress,
	toLearnerContent,
} from "@youlearn/content";
import { and, db, desc, eq, isNull, schema } from "@youlearn/db";
import type {
	EnrollmentView,
	LearnerCourse,
	LearnerEnrollment,
} from "@youlearn/types";
import { visibleTo } from "./catalog";
import { type CourseActor, canViewCourse, findCourse } from "./courses";
import { isUniqueViolation } from "./groups";

const { chapterProgress, course, courseRevision, enrollment, quizAttempt } =
	schema;

type EnrollmentRow = typeof enrollment.$inferSelect;

const toLearnerEnrollment = (
	row: EnrollmentRow,
	revisionKey: string,
	/** The revision published now, if any. */
	currentRevisionId: string | undefined,
): LearnerEnrollment => ({
	id: row.id,
	status: row.status,
	revisionKey,
	startedAt: row.startedAt.toISOString(),
	finishedAt: row.finishedAt?.toISOString() ?? null,
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
		.select({ enrollment, revisionKey: courseRevision.key })
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
	const latest = await findLatestEnrollment(actor.id, courseId);
	const { content, revisionId, revisionKey, publishedAt, ...rest } = published;
	return {
		...rest,
		publishedAt: publishedAt.toISOString(),
		chapters: content.chapters.map((chapter) => ({
			id: chapter.id,
			title: chapter.title,
			kind: chapter.kind ?? "standard",
			estimatedMinutes: chapter.estimatedMinutes ?? null,
		})),
		enrollment: latest
			? toLearnerEnrollment(latest.enrollment, latest.revisionKey, revisionId)
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
	const progress = await loadProgress(db, enrollmentId);
	const chapterStatesById = chapterStates(row.revision.content, progress);
	const learnerContent = toLearnerContent(row.revision.content);
	return {
		enrollment: toLearnerEnrollment(
			row.enrollment,
			row.revision.key,
			current?.id,
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
