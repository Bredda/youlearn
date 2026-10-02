import type { Readable } from "node:stream";
import {
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

/** Creates the bucket when it does not exist yet (idempotent, like the other startup seeds). */
export async function ensureBucket(logger: {
	info: (message: string) => void;
}) {
	try {
		await s3.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
	} catch (error) {
		if (
			(error as { $metadata?: { httpStatusCode?: number } }).$metadata
				?.httpStatusCode !== 404
		) {
			throw error;
		}
		await s3.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
		logger.info(`Storage bucket created (${S3_BUCKET})`);
	}
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

export async function objectExists(key: string) {
	try {
		await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key }));
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
