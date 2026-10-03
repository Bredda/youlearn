import { createHash } from "node:crypto";
import { and, db, eq, inArray, schema, sql } from "@youlearn/db";
import { objectExists, putObject } from "@youlearn/storage";
import type { WriterAsset, WriterCourse } from "@youlearn/types";
import { type CourseActor, canEditCourse, canViewCourse } from "./courses";
import { sniffImageType } from "./image-type";
import { escapeLike } from "./sql";

const { courseAsset, courseRevision, enrollment } = schema;

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

/** A revision of the course (optionally in a given status / with a given review token) whose content uses the file. */
async function revisionUses(
	courseId: string,
	assetId: string,
	where: {
		status?: "published" | "preview";
		statuses?: ("published" | "deprecated")[];
		token?: string;
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
			where.token ? eq(courseRevision.previewToken, where.token) : undefined,
			where.id ? eq(courseRevision.id, where.id) : undefined,
			sql`${courseRevision.content}::text like ${`%asset:${escapeLike(assetId)}%`}`,
		),
	);
	return count > 0;
}

/**
 * Editors read every file of their courses. Everybody else only reads what is meant to be shown: the cover, and
 * the files used by the published revision (or, holding a valid review link, by the revision in review) and, for a
 * learner, by the revision they follow. That keeps the files of drafts private even from the members of the groups
 * of the course.
 */
export async function canReadAsset(
	actor: CourseActor,
	course: WriterCourse,
	assetId: string,
	reviewToken?: string,
) {
	if (canEditCourse(actor, course)) return true;

	if (reviewToken) {
		const [reviewed] = await db
			.select({ parentId: courseRevision.parentId })
			.from(courseRevision)
			.where(
				and(
					eq(courseRevision.courseId, course.id),
					eq(courseRevision.status, "preview"),
					eq(courseRevision.previewToken, reviewToken),
				),
			);
		if (
			reviewed &&
			(course.imageAssetId === assetId ||
				(await revisionUses(course.id, assetId, { token: reviewToken })) ||
				// The review shows what changed since the base, so the files only the base uses (an image that was
				// replaced) must load too. Same rule as `findReviewBase`: a published or deprecated parent only.
				(reviewed.parentId !== null &&
					(await revisionUses(course.id, assetId, {
						id: reviewed.parentId,
						statuses: ["published", "deprecated"],
					}))))
		)
			return true;
	}

	if (!canViewCourse(actor, course)) return false;
	if (
		course.imageAssetId === assetId ||
		(await revisionUses(course.id, assetId, { status: "published" }))
	)
		return true;

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
