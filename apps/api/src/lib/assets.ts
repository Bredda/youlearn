import { createHash } from "node:crypto";
import { and, db, eq, schema } from "@youlearn/db";
import { objectExists, putObject } from "@youlearn/storage";
import type { WriterAsset } from "@youlearn/types";

const { courseAsset } = schema;

export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/** One blob per distinct file and course: the hash is the identity, the bytes never change. */
export const assetKey = (courseId: string, sha256: string) =>
	`courses/${courseId}/assets/${sha256}`;

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
	signature.every((byte, index) => bytes[offset + index] === byte);

/**
 * The image type according to the file's own bytes, never the client's claim. SVG is left out on purpose: it can
 * carry scripts and the files are served from the app's origin.
 */
export function sniffImageType(bytes: Uint8Array) {
	if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
		return "image/png";
	if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
	if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return "image/gif";
	// "RIFF" <size> "WEBP"
	if (
		startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
		startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)
	)
		return "image/webp";
	return undefined;
}

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
