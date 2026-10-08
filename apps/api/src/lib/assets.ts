import { createHash } from "node:crypto";
import { and, db, eq, inArray, schema, sql } from "@youlearn/db";
import { objectExists, putObject } from "@youlearn/storage";
import type { WriterAsset, WriterCourse } from "@youlearn/types";
import { type CourseActor, canEditCourse, canViewCourse } from "./courses";
import { sniffImageType } from "./image-type";
import { escapeLike } from "./sql";

const { courseAsset, courseRevision, enrollment, revisionReviewer } = schema;

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/** One blob per distinct file and course: the hash is the identity, the bytes never change. */
export const assetKey = (courseId: string, sha256: string) =>
	`courses/${courseId}/assets/${sha256}`;

const safeFilename = (name: string) =>
	name.replace(/[\\/\p{Cc}]/gu, "_").slice(0, 200) || "image";

/** Stores an image of a course (deduplicated by content) and returns its asset record. */
export async function storeImage(
	courseId: string,
	filename: string,
	bytes: Buffer,
): Promise<WriterAsset | undefined> {
	const contentType = sniffImageType(bytes);
	if (!contentType) return undefined;

	const sha256 = createHash("sha256").update(bytes).digest("hex");
	const key = assetKey(courseId, sha256);
	if (!(await objectExists(key))) await putObject(key, bytes, contentType);

	const columns = {
		id: courseAsset.id,
		courseId: courseAsset.courseId,
		contentType: courseAsset.contentType,
		size: courseAsset.size,
		filename: courseAsset.filename,
	};
	const [created] = await db
		.insert(courseAsset)
		.values({
			courseId,
			sha256,
			contentType,
			size: bytes.length,
			filename: safeFilename(filename),
		})
		.onConflictDoNothing()
		.returning(columns);
	if (created) return created;

	// Same file already uploaded to this course.
	const [existing] = await db
		.select(columns)
		.from(courseAsset)
		.where(
			and(eq(courseAsset.courseId, courseId), eq(courseAsset.sha256, sha256)),
		);
	return existing;
}

/** A revision of the course (optionally in a given status or with a given id) whose content uses the file. */
async function revisionUses(
	courseId: string,
	assetId: string,
	where: {
		status?: "published" | "preview";
		statuses?: ("published" | "deprecated")[];
		id?: string;
	},
) {
	const count = await db.$count(
		courseRevision,
		and(
			eq(courseRevision.courseId, courseId),
			where.status ? eq(courseRevision.status, where.status) : undefined,
			where.statuses
				? inArray(courseRevision.status, where.statuses)
				: undefined,
			where.id ? eq(courseRevision.id, where.id) : undefined,
			sql`${courseRevision.content}::text like ${`%asset:${escapeLike(assetId)}%`}`,
		),
	);
	return count > 0;
}

/**
 * Whether a reviewer may read the file: the cover, the files of the revision they are asked to review and, since
 * the review shows what changed, those of its base (an image that was replaced must still load). Same rule as
 * `findReviewBase`: a published or deprecated parent only, never somebody's unpublished work.
 */
async function reviewerCanRead(
	actor: CourseActor,
	course: WriterCourse,
	assetId: string,
) {
	const [reviewed] = await db
		.select({ id: courseRevision.id, parentId: courseRevision.parentId })
		.from(courseRevision)
		.innerJoin(
			revisionReviewer,
			eq(revisionReviewer.revisionId, courseRevision.id),
		)
		.where(
			and(
				eq(courseRevision.courseId, course.id),
				eq(courseRevision.status, "preview"),
				eq(revisionReviewer.userId, actor.id),
			),
		);
	if (!reviewed) return false;
	return (
		course.imageAssetId === assetId ||
		(await revisionUses(course.id, assetId, { id: reviewed.id })) ||
		(reviewed.parentId !== null &&
			(await revisionUses(course.id, assetId, {
				id: reviewed.parentId,
				statuses: ["published", "deprecated"],
			})))
	);
}

/**
 * Editors read every file of their courses. Everybody else only reads what is meant to be shown: the cover, and
 * the files used by the published revision and, for a learner, by the revision they follow; a reviewer also reads
 * the files of the revision they review (even outside the course's groups). That keeps the files of drafts
 * private even from the members of the groups of the course.
 */
export async function canReadAsset(
	actor: CourseActor,
	course: WriterCourse,
	assetId: string,
) {
	if (canEditCourse(actor, course)) return true;

	const visible = canViewCourse(actor, course);
	if (
		visible &&
		(course.imageAssetId === assetId ||
			(await revisionUses(course.id, assetId, { status: "published" })))
	)
		return true;
	if (await reviewerCanRead(actor, course, assetId)) return true;
	if (!visible) return false;

	// A learner keeps the files of the revision they follow, even once it is no longer the published one.
	const followed = await db
		.select({ revisionId: enrollment.revisionId })
		.from(enrollment)
		.where(
			and(eq(enrollment.userId, actor.id), eq(enrollment.courseId, course.id)),
		);
	for (const { revisionId } of followed)
		if (await revisionUses(course.id, assetId, { id: revisionId })) return true;
	return false;
}
