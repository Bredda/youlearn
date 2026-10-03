import type { Readable } from "node:stream";
import {
	CopyObjectCommand,
	CreateBucketCommand,
	DeleteObjectCommand,
	GetObjectCommand,
	HeadBucketCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@youlearn/config";

const { S3_ENDPOINT, S3_BUCKET, S3_REGION } = env;
const DEPRECATED_BUCKET = env.S3_DEPRECATED_BUCKET ?? `${S3_BUCKET}-deprecated`;

export const s3 = new S3Client({
	endpoint: S3_ENDPOINT,
	region: S3_REGION,
	credentials: {
		accessKeyId: env.S3_ACCESS_KEY,
		secretAccessKey: env.S3_SECRET_KEY,
	},
	// Self-hosted servers do not resolve `<bucket>.<host>`.
	forcePathStyle: true,
});

/** Default lifetime of a signed URL, in seconds. */
const SIGNED_URL_TTL = 15 * 60;

async function ensureOneBucket(
	bucket: string,
	logger: { info: (message: string) => void },
) {
	try {
		await s3.send(new HeadBucketCommand({ Bucket: bucket }));
	} catch (error) {
		if (
			(error as { $metadata?: { httpStatusCode?: number } }).$metadata
				?.httpStatusCode !== 404
		) {
			throw error;
		}
		await s3.send(new CreateBucketCommand({ Bucket: bucket }));
		logger.info(`Storage bucket created (${bucket})`);
	}
}

/** Creates the buckets (files, and the one for deprecated files) when they do not exist yet (idempotent). */
export async function ensureBucket(logger: {
	info: (message: string) => void;
}) {
	await ensureOneBucket(S3_BUCKET, logger);
	await ensureOneBucket(DEPRECATED_BUCKET, logger);
}

export async function putObject(
	key: string,
	body: Uint8Array | string,
	contentType: string,
) {
	await s3.send(
		new PutObjectCommand({
			Bucket: S3_BUCKET,
			Key: key,
			Body: body,
			ContentType: contentType,
		}),
	);
}

export async function objectExists(
	key: string,
	where: "files" | "deprecated" = "files",
) {
	try {
		await s3.send(
			new HeadObjectCommand({
				Bucket: where === "files" ? S3_BUCKET : DEPRECATED_BUCKET,
				Key: key,
			}),
		);
		return true;
	} catch (error) {
		if (
			(error as { $metadata?: { httpStatusCode?: number } }).$metadata
				?.httpStatusCode === 404
		)
			return false;
		throw error;
	}
}

export type StoredObject = {
	body: Readable;
	contentType: string | undefined;
	/** Bytes in `body` (the requested range when there is one). */
	contentLength: number | undefined;
	/** Set when a `Range` was requested, e.g. `bytes 0-99/1000`. */
	contentRange: string | undefined;
};

/** Streams an object, honouring an HTTP `Range` header (video playback seeks with it). */
export async function getObject(
	key: string,
	range?: string,
): Promise<StoredObject | undefined> {
	try {
		const result = await s3.send(
			new GetObjectCommand({ Bucket: S3_BUCKET, Key: key, Range: range }),
		);
		return {
			body: result.Body as Readable,
			contentType: result.ContentType,
			contentLength: result.ContentLength,
			contentRange: result.ContentRange,
		};
	} catch (error) {
		if ((error as { name?: string }).name === "NoSuchKey") return undefined;
		throw error;
	}
}

/**
 * "Removes" a file by moving it to the deprecated bucket under the same key (S3 has no move: copy, then delete).
 * The application never deletes files for good. Does nothing when the file is already gone.
 */
export async function moveToDeprecated(key: string) {
	try {
		await s3.send(
			new CopyObjectCommand({
				Bucket: DEPRECATED_BUCKET,
				Key: key,
				// Per the S3 API the source is `<bucket>/<key>`, URL-encoded except the slashes.
				CopySource: encodeURIComponent(`${S3_BUCKET}/${key}`).replace(
					/%2F/g,
					"/",
				),
			}),
		);
	} catch (error) {
		if ((error as { name?: string }).name === "NoSuchKey") return;
		throw error;
	}
	await deleteObject(key);
}

export async function deleteObject(key: string) {
	await s3.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
}

/** Short-lived download URL: the API checks visibility, then hands this out. */
export function presignGet(key: string, expiresIn = SIGNED_URL_TTL) {
	return getSignedUrl(
		s3,
		new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }),
		{ expiresIn },
	);
}

/** Short-lived upload URL, so large files (videos) never transit through the API. */
export function presignPut(
	key: string,
	contentType: string,
	expiresIn = SIGNED_URL_TTL,
) {
	return getSignedUrl(
		s3,
		new PutObjectCommand({
			Bucket: S3_BUCKET,
			Key: key,
			ContentType: contentType,
		}),
		{ expiresIn },
	);
}
