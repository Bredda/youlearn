import { reviewTargetSchema } from "@youlearn/content";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { getCourseActor } from "../lib/courses";
import {
	createReply,
	createThread,
	findCommentAccess,
	listThreads,
	setThreadStatus,
} from "../lib/review-comments";

const params = z.object({ revisionId: z.string().min(1) });
const commentParams = params.extend({ commentId: z.string().min(1) });

const body = z.string().trim().min(1).max(4000);
const createBody = z.union([
	z.object({ parentId: z.string().min(1), body }),
	z.object({
		target: reviewTargetSchema,
		quote: z.string().trim().max(500).optional(),
		body,
	}),
]);
const statusBody = z.object({ status: z.enum(["open", "resolved"]) });

/**
 * The remarks of a review: threads anchored on the chapters, blocks and questions of a revision. Shared by the
 * reviewers and the editors of the course (one conversation), so the routes are not under the writer area. The
 * remarks are not logged as events: they are the trail themselves, and they are frequent.
 */
export const reviewCommentRoutes: FastifyPluginAsync = async (app) => {
	app.addHook("preHandler", app.requireAuth);

	app.get("/api/revisions/:revisionId/comments", async (request, reply) => {
		const { revisionId } = params.parse(request.params);
		const access = await findCommentAccess(
			await getCourseActor(request),
			revisionId,
		);
		if (!access) return reply.code(404).send({ error: "Revision not found" });
		return {
			threads: await listThreads(access.revision),
			canWrite: access.canWrite,
		};
	});

	app.post("/api/revisions/:revisionId/comments", async (request, reply) => {
		const { revisionId } = params.parse(request.params);
		const input = createBody.parse(request.body);
		const actor = await getCourseActor(request);
		const access = await findCommentAccess(actor, revisionId);
		if (!access) return reply.code(404).send({ error: "Revision not found" });
		if (!access.canWrite)
			return reply.code(409).send({
				error: "Remarks can only be added while the revision is in review",
			});

		const result =
			"parentId" in input
				? await createReply(access.revision, actor, input.parentId, input.body)
				: await createThread(access.revision, actor, input);
		if (!result.ok)
			return reply.code(result.status).send({ error: result.error });
		return reply.code(201).send({
			threads: await listThreads(access.revision),
			canWrite: access.canWrite,
		});
	});

	app.patch(
		"/api/revisions/:revisionId/comments/:commentId",
		async (request, reply) => {
			const { revisionId, commentId } = commentParams.parse(request.params);
			const { status } = statusBody.parse(request.body);
			const actor = await getCourseActor(request);
			const access = await findCommentAccess(actor, revisionId);
			if (!access) return reply.code(404).send({ error: "Revision not found" });
			if (!access.canWrite)
				return reply.code(409).send({
					error: "Remarks can only be changed while the revision is in review",
				});

			const result = await setThreadStatus(
				access.revision,
				actor,
				commentId,
				status,
			);
			if (!result.ok)
				return reply.code(result.status).send({ error: result.error });
			return {
				threads: await listThreads(access.revision),
				canWrite: access.canWrite,
			};
		},
	);
};
