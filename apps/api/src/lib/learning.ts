import { toLearnerContent } from "@youlearn/content";
import { and, db, desc, eq, isNull, schema } from "@youlearn/db";
import type {
	EnrollmentView,
	LearnerCourse,
	LearnerEnrollment,
} from "@youlearn/types";
import { visibleTo } from "./catalog";
import { type CourseActor, canViewCourse, findCourse } from "./courses";
import { isUniqueViolation } from "./groups";

const { course, courseRevision, enrollment } = schema;

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
 * The player of an enrollment: only its owner reads it, and only while they still see the course (groups can
 * change, the course can be archived). The revision is the pinned one, whatever its status now.
 */
export async function findEnrollmentView(
	actor: CourseActor,
	enrollmentId: string,
): Promise<EnrollmentView | undefined> {
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
	if (!target || !canViewCourse(actor, target)) return undefined;

	const [current] = await db
		.select({ id: courseRevision.id })
		.from(courseRevision)
		.where(
			and(
				eq(courseRevision.courseId, row.course.id),
				eq(courseRevision.status, "published"),
			),
		);
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
		content: toLearnerContent(row.revision.content),
	};
}
