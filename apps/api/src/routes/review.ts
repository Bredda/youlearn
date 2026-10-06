import type { ReviewView } from "@youlearn/types";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
	findReviewBase,
	findReviewForReviewer,
	listMyReviews,
} from "../lib/revisions";

const params = z.object({ revisionId: z.string().min(1) });

/**
 * What a reviewer reads. Being asked to review a revision (an assignment written by the course's editors) is the
 * whole permission: it lasts while the revision is in preview, so sending it back to draft, publishing it or
 * deleting it ends the access (a revision that is not yours and one that is over look the same: 404).
 */
export const reviewRoutes: FastifyPluginAsync = async (app) => {
	app.addHook("preHandler", app.requireAuth);

	app.get("/api/me/reviews", async (request, reply) => {
		if (!request.auth) return reply.code(401).send({ error: "Unauthorized" });
		return { reviews: await listMyReviews(request.auth.user.id) };
	});

	app.get(
		"/api/reviews/:revisionId",
		async (request, reply): Promise<ReviewView | undefined> => {
			if (!request.auth) return reply.code(401).send({ error: "Unauthorized" });
			const { revisionId } = params.parse(request.params);
			const found = await findReviewForReviewer(
				request.auth.user.id,
				revisionId,
			);
			if (!found) return reply.code(404).send({ error: "Review not found" });
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
					durationMinutes: revision.durationMinutes,
					certifying: revision.certifying,
				},
				content: revision.content,
				base: await findReviewBase(revision),
			};
		},
	);
};
