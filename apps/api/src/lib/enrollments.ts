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
	ne,
	or,
	schema,
	sql,
} from "@youlearn/db";
import type {
	CourseEnrollment,
	CourseEnrollmentDetail,
	CourseEnrollmentPage,
	CourseEnrollmentQuery,
	EnrollmentMove,
	MyEnrollment,
} from "@youlearn/types";
import { type CourseActor, canViewCourse, findCourse } from "./courses";
import { loadEnrollmentExtras, NO_EXTRAS } from "./enrollment-update";
import { escapeLike } from "./sql";

const {
	chapterProgress,
	course,
	courseRevision,
	enrollment,
	event,
	quizAttempt,
	user,
} = schema;

const completedChapters = sql<number>`(select count(*)::int from ${chapterProgress} where ${chapterProgress.enrollmentId} = ${enrollment.id})`;
const totalChapters = sql<number>`coalesce(jsonb_array_length(${courseRevision.content} -> 'chapters'), 0)::int`;
const submittedAttempts = sql<number>`(select count(*)::int from ${quizAttempt} where ${quizAttempt.enrollmentId} = ${enrollment.id} and ${quizAttempt.submittedAt} is not null)`;
export const finalExamScore = sql<
	number | null
>`(select ${quizAttempt.score} from ${quizAttempt} where ${quizAttempt.enrollmentId} = ${enrollment.id} and ${quizAttempt.finalExam} limit 1)`;
const publishedRevisionId = sql<
	string | null
>`(select id from ${courseRevision} as p where p.course_id = ${enrollment.courseId} and p.status = 'published')`;

/** The learner's enrollments, the ones in progress first, for the courses they can still open. */
export async function listMyEnrollments(
	actor: CourseActor,
): Promise<MyEnrollment[]> {
	const rows = await db
		.select({
			id: enrollment.id,
			status: enrollment.status,
			courseId: course.id,
			courseName: course.name,
			imageAssetId: course.imageAssetId,
			revisionId: enrollment.revisionId,
			revisionKey: courseRevision.key,
			certifying: courseRevision.certifying,
			startedAt: enrollment.startedAt,
			finishedAt: enrollment.finishedAt,
			previousEnrollmentId: enrollment.previousEnrollmentId,
			noticeAckedAt: enrollment.noticeAckedAt,
			updatePostponedRevisionId: enrollment.updatePostponedRevisionId,
			currentRevisionId: publishedRevisionId,
			completedChapters,
			totalChapters,
		})
		.from(enrollment)
		.innerJoin(course, eq(course.id, enrollment.courseId))
		.innerJoin(courseRevision, eq(courseRevision.id, enrollment.revisionId))
		// A superseded enrollment is history of the one that continues it: listed alone it would be a duplicate.
		.where(
			and(
				eq(enrollment.userId, actor.id),
				ne(enrollment.status, "superseded"),
				isNull(course.deletedAt),
			),
		)
		.orderBy(
			sql`case when ${enrollment.status} = 'in_progress' then 0 else 1 end`,
			desc(enrollment.startedAt),
		);

	// Groups can change after enrolling: do not list what the learner can no longer open.
	const visible = new Map<string, boolean>();
	for (const { courseId } of rows) {
		if (visible.has(courseId)) continue;
		const target = await findCourse(courseId);
		visible.set(courseId, target !== undefined && canViewCourse(actor, target));
	}
	const shown = rows.filter((row) => visible.get(row.courseId));
	const extras = await loadEnrollmentExtras(shown);
	return shown.map(
		({
			revisionId,
			currentRevisionId,
			previousEnrollmentId,
			noticeAckedAt,
			updatePostponedRevisionId,
			...row
		}) => ({
			...row,
			startedAt: row.startedAt.toISOString(),
			finishedAt: row.finishedAt?.toISOString() ?? null,
			outdated: currentRevisionId !== null && currentRevisionId !== revisionId,
			...(extras.get(row.id) ?? NO_EXTRAS),
		}),
	);
}

const sortColumns = {
	startedAt: enrollment.startedAt,
	learner: sql`lower(${user.name})`,
	status: enrollment.status,
};

const toCourseEnrollment = (row: {
	id: string;
	learnerId: string;
	learnerName: string;
	learnerEmail: string;
	status: CourseEnrollment["status"];
	revisionKey: string;
	revisionId: string;
	currentRevisionId: string | null;
	startedAt: Date;
	finishedAt: Date | null;
	completedChapters: number;
	totalChapters: number;
	attemptCount: number;
	finalExamScore: number | null;
}): CourseEnrollment => ({
	id: row.id,
	learner: {
		id: row.learnerId,
		name: row.learnerName,
		email: row.learnerEmail,
	},
	status: row.status,
	revisionKey: row.revisionKey,
	outdated:
		row.status === "in_progress" &&
		row.currentRevisionId !== null &&
		row.currentRevisionId !== row.revisionId,
	startedAt: row.startedAt.toISOString(),
	finishedAt: row.finishedAt?.toISOString() ?? null,
	completedChapters: row.completedChapters,
	totalChapters: row.totalChapters,
	attemptCount: row.attemptCount,
	finalExamScore: row.finalExamScore,
});

const courseEnrollmentColumns = {
	id: enrollment.id,
	learnerId: user.id,
	learnerName: user.name,
	learnerEmail: user.email,
	status: enrollment.status,
	revisionKey: courseRevision.key,
	revisionId: enrollment.revisionId,
	currentRevisionId: publishedRevisionId,
	startedAt: enrollment.startedAt,
	finishedAt: enrollment.finishedAt,
	completedChapters,
	totalChapters,
	attemptCount: submittedAttempts,
	finalExamScore,
};

/** The learners of a course, filtered, sorted and paginated. The caller checked that the actor edits the course. */
export async function listCourseEnrollments(
	courseId: string,
	query: CourseEnrollmentQuery,
): Promise<CourseEnrollmentPage> {
	const { q, status, sort, order, page, pageSize } = query;
	const search = q ? `%${escapeLike(q)}%` : undefined;
	const where = and(
		eq(enrollment.courseId, courseId),
		// The learner's current enrollment stands for the ones it continues (see `enrollment.previousEnrollmentId`).
		ne(enrollment.status, "superseded"),
		status ? eq(enrollment.status, status) : undefined,
		search
			? or(ilike(user.name, search), ilike(user.email, search))
			: undefined,
	);
	const direction = order === "asc" ? asc : desc;

	const [{ total = 0 } = {}] = await db
		.select({ total: count() })
		.from(enrollment)
		.innerJoin(user, eq(user.id, enrollment.userId))
		.where(where);
	const rows = await db
		.select(courseEnrollmentColumns)
		.from(enrollment)
		.innerJoin(user, eq(user.id, enrollment.userId))
		.innerJoin(courseRevision, eq(courseRevision.id, enrollment.revisionId))
		.where(where)
		.orderBy(direction(sortColumns[sort]), asc(enrollment.id))
		.limit(pageSize)
		.offset((page - 1) * pageSize);

	return { enrollments: rows.map(toCourseEnrollment), total, page, pageSize };
}

/**
 * The moves of a learner between revisions that led to this enrollment, oldest first. The chain of enrollments says
 * between which revisions and when; the event log, which has no foreign key to them, says whether it was automatic
 * and what it sent back (missing when the event could not be recorded).
 */
async function findMoves(enrollmentId: string): Promise<EnrollmentMove[]> {
	const chain: {
		id: string;
		previousEnrollmentId: string | null;
		revisionKey: string;
		createdAt: Date;
	}[] = [];
	let current: string | null = enrollmentId;
	for (let hops = 0; current !== null && hops < 50; hops++) {
		const [row] = await db
			.select({
				id: enrollment.id,
				previousEnrollmentId: enrollment.previousEnrollmentId,
				revisionKey: courseRevision.key,
				createdAt: enrollment.createdAt,
				finishedAt: enrollment.finishedAt,
			})
			.from(enrollment)
			.innerJoin(courseRevision, eq(courseRevision.id, enrollment.revisionId))
			.where(eq(enrollment.id, current));
		if (!row) break;
		chain.push(row);
		current = row.previousEnrollmentId;
	}
	// `chain` is newest first: each entry that has a previous one is the result of a move from the entry after it.
	const moved = chain.slice(0, -1);
	if (moved.length === 0) return [];
	const events = await db
		.select({ targetId: event.targetId, metadata: event.metadata })
		.from(event)
		.where(
			and(
				eq(event.type, "enrollment.migrate"),
				inArray(
					event.targetId,
					moved.map((entry) => entry.id),
				),
			),
		);
	const trace = new Map(events.map((e) => [e.targetId, e.metadata ?? {}]));
	return moved
		.map((entry, index): EnrollmentMove => {
			const before = chain[index + 1];
			const metadata = trace.get(entry.id);
			return {
				fromRevisionKey: before?.revisionKey ?? "",
				toRevisionKey: entry.revisionKey,
				at: entry.createdAt.toISOString(),
				automatic:
					typeof metadata?.automatic === "boolean" ? metadata.automatic : null,
				redone: typeof metadata?.redone === "number" ? metadata.redone : null,
			};
		})
		.reverse();
}

/** One learner's enrollment with its chapters and every quiz attempt (the traces of a failure). */
export async function findCourseEnrollmentDetail(
	courseId: string,
	enrollmentId: string,
): Promise<CourseEnrollmentDetail | undefined> {
	const [row] = await db
		.select({ ...courseEnrollmentColumns, content: courseRevision.content })
		.from(enrollment)
		.innerJoin(user, eq(user.id, enrollment.userId))
		.innerJoin(courseRevision, eq(courseRevision.id, enrollment.revisionId))
		.where(
			and(eq(enrollment.id, enrollmentId), eq(enrollment.courseId, courseId)),
		);
	if (!row) return undefined;

	const [done, attempts] = await Promise.all([
		db
			.select({ chapterId: chapterProgress.chapterId })
			.from(chapterProgress)
			.where(eq(chapterProgress.enrollmentId, enrollmentId)),
		db
			.select()
			.from(quizAttempt)
			.where(eq(quizAttempt.enrollmentId, enrollmentId))
			.orderBy(asc(quizAttempt.startedAt)),
	]);
	const completed = new Set(done.map((entry) => entry.chapterId));
	const titles = new Map(row.content.chapters.map((c) => [c.id, c.title]));

	return {
		...toCourseEnrollment(row),
		moves: await findMoves(enrollmentId),
		chapters: row.content.chapters.map((chapter) => ({
			id: chapter.id,
			title: chapter.title,
			kind: chapter.kind ?? "standard",
			completed: completed.has(chapter.id),
		})),
		attempts: attempts.map((attempt) => ({
			id: attempt.id,
			chapterId: attempt.chapterId,
			chapterTitle: titles.get(attempt.chapterId) ?? attempt.chapterId,
			finalExam: attempt.finalExam,
			score: attempt.score,
			passed: attempt.passed,
			startedAt: attempt.startedAt.toISOString(),
			submittedAt: attempt.submittedAt?.toISOString() ?? null,
		})),
	};
}
