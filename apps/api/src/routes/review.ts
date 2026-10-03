import type { ReviewView } from "@youlearn/types";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { findReviewBase, findRevisionByToken } from "../lib/revisions";

const params = z.object({ token: z.string().min(1).max(200) });

/**
 * Read-only view of a revision in preview, for whoever is signed in and holds the link. The link is a capability:
 * it is valid only while the revision is in preview, so promoting, reworking or revoking it ends the access
 * (an unknown token and an ended one look the same).
 */
export const reviewRoutes: FastifyPluginAsync = async (app) => {
	app.get(
		"/api/review/:token",
		{ preHandler: app.requireAuth },
		async (request, reply): Promise<ReviewView | undefined> => {
			const { token } = params.parse(request.params);
			const found = await findRevisionByToken(token);
			if (!found)
				return reply.code(404).send({ error: "Review link not found" });
			const { course, revision } = found;
			return {
				course: {
					id: course.id,
					name: course.name,
					description: course.description,
					categories: course.categories,
					imageAssetId: course.imageAssetId,
				},
				revision: {
					id: revision.id,
					key: revision.key,
					purpose: revision.purpose,
				},
				content: revision.content,
				base: await findReviewBase(revision),
				token,
			};
		},
	);
};
