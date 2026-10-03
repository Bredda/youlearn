import { recordEvent } from "@youlearn/events/server";
import type { EnrollmentView, LearnerCourse } from "@youlearn/types";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { getCourseActor } from "../lib/courses";
import {
	findEnrollmentView,
	findLearnerCourse,
	startEnrollment,
} from "../lib/learning";

const idParams = z.object({ id: z.string().min(1).max(100) });

/**
 * The learner side of a course: its sheet, the enrollment and the player. A learner only ever receives
 * `LearnerContent` (no quiz question, so no answer); the rules of what they may open live in `lib/learning.ts`.
 */
export const learningRoutes: FastifyPluginAsync = async (app) => {
	app.get(
		"/api/courses/:id",
		{ preHandler: app.requireAuth },
		async (request, reply): Promise<LearnerCourse | undefined> => {
			const { id } = idParams.parse(request.params);
			const found = await findLearnerCourse(await getCourseActor(request), id);
			if (!found) return reply.code(404).send({ error: "Course not found" });
			return found;
		},
	);

	app.post(
		"/api/courses/:id/enroll",
		{ preHandler: app.requireAuth },
		async (request, reply) => {
			const { id } = idParams.parse(request.params);
			const actor = await getCourseActor(request);
			const result = await startEnrollment(actor, id);
			if (!result.ok) {
				if (result.reason === "NOT_FOUND")
					return reply.code(404).send({ error: "Course not found" });
				return reply
					.code(409)
					.send({ error: "Already enrolled", code: "ALREADY_ENROLLED" });
			}
			await recordEvent(
				{
					type: "enrollment.start",
					actor: { id: actor.id, label: actor.label },
					target: {
						type: "enrollment",
						id: result.enrollment.id,
						label: result.courseName,
					},
					metadata: {
						courseId: id,
						revisionKey: result.enrollment.revisionKey,
						restart: result.restart,
					},
				},
				request.log,
			);
			return reply.code(201).send({ enrollment: result.enrollment });
		},
	);

	app.get(
		"/api/enrollments/:id",
		{ preHandler: app.requireAuth },
		async (request, reply): Promise<EnrollmentView | undefined> => {
			const { id } = idParams.parse(request.params);
			const view = await findEnrollmentView(await getCourseActor(request), id);
			if (!view) return reply.code(404).send({ error: "Enrollment not found" });
			return view;
		},
	);
};
