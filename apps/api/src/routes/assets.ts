import multipart from "@fastify/multipart";
import { and, db, eq, schema } from "@youlearn/db";
import { getObject } from "@youlearn/storage";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { assetKey, MAX_IMAGE_SIZE, storeImage } from "../lib/assets";
import {
	authorizeCourse,
	canViewCourse,
	findCourse,
	getCourseActor,
} from "../lib/courses";

const { courseAsset } = schema;

const courseParams = z.object({ id: z.string().min(1) });
const assetParams = courseParams.extend({ assetId: z.string().min(1) });

/**
 * Files of a course. Everything goes through the API (the browser only talks to the web origin): uploads here,
 * downloads streamed from the object storage after checking who may read the course.
 */
export const assetRoutes: FastifyPluginAsync = async (app) => {
	await app.register(multipart, {
		limits: { fileSize: MAX_IMAGE_SIZE, files: 1 },
	});

	app.post(
		"/api/writer/courses/:id/assets",
		{ preHandler: app.requireWriter },
		async (request, reply) => {
			const { id } = courseParams.parse(request.params);
			const access = await authorizeCourse(request, reply, id);
			if (!access) return;

			const file = await request.file();
			if (!file) return reply.code(400).send({ error: "No file" });
			const bytes = await file.toBuffer();
			if (file.file.truncated)
				return reply.code(413).send({ error: "The image is over 5 MB" });

			const asset = await storeImage(id, file.filename, bytes);
			if (!asset)
				return reply
					.code(400)
					.send({ error: "Only PNG, JPEG, GIF and WebP images are accepted" });
			return reply.code(201).send({ asset });
		},
	);

	app.get(
		"/api/courses/:id/assets/:assetId",
		{ preHandler: app.requireAuth },
		async (request, reply) => {
			const { id, assetId } = assetParams.parse(request.params);
			const [asset] = await db
				.select()
				.from(courseAsset)
				.where(and(eq(courseAsset.id, assetId), eq(courseAsset.courseId, id)));
			const target = asset && (await findCourse(id));
			if (!asset || !target)
				return reply.code(404).send({ error: "File not found" });
			if (!canViewCourse(await getCourseActor(request), target))
				return reply.code(403).send({ error: "Forbidden" });

			const stored = await getObject(
				assetKey(id, asset.sha256),
				request.headers.range,
			);
			if (!stored) return reply.code(404).send({ error: "File not found" });

			reply
				.code(stored.contentRange ? 206 : 200)
				.header("content-type", asset.contentType)
				.header("x-content-type-options", "nosniff")
				.header("accept-ranges", "bytes")
				// Content never changes under an id, but it is only for signed-in readers.
				.header("cache-control", "private, max-age=31536000, immutable");
			if (stored.contentLength !== undefined)
				reply.header("content-length", stored.contentLength);
			if (stored.contentRange)
				reply.header("content-range", stored.contentRange);
			return reply.send(stored.body);
		},
	);
};
