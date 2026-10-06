import { recordEvent } from "@youlearn/events/server";
import type { ReviewView } from "@youlearn/types";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
	findReviewBase,
	findReviewForReviewer,
	listMyReviews,
	setVerdict,
} from "../lib/revisions";

const params = z.object({ revisionId: z.string().min(1) });
const verdictBody = z.object({
	verdict: z.enum(["approved", "changes_requested"]),
});

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
			const { course, revision, state } = found;
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
				myState: state,
			};
		},
	);

	// The reviewer's opinion; it can be changed until the revision leaves the review.
	app.put("/api/reviews/:revisionId/verdict", async (request, reply) => {
		if (!request.auth) return reply.code(401).send({ error: "Unauthorized" });
		const { revisionId } = params.parse(request.params);
		const { verdict } = verdictBody.parse(request.body);
		const { id, email } = request.auth.user;

		const result = await setVerdict(id, revisionId, verdict);
		if (!result.ok)
			return reply.code(result.status).send({ error: result.error });
		await recordEvent(
			{
				type: "revision.verdict",
				actor: { id, label: email },
				target: { type: "revision", id: revisionId, label: result.key },
				metadata: { courseId: result.courseId, verdict },
			},
			request.log,
		);
		return reply.code(204).send();
	});
};
