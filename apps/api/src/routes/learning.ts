import { recordEvent } from "@youlearn/events/server";
import type {
	AttemptResult,
	EnrollmentView,
	LearnerAttempt,
	LearnerCourse,
	MyEnrollment,
} from "@youlearn/types";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { getCourseActor } from "../lib/courses";
import { migrationMetadata } from "../lib/enrollment-migration";
import { listMyEnrollments } from "../lib/enrollments";
import {
	completeChapter,
	findEnrollmentView,
	findLearnerCourse,
	migrateOwnEnrollment,
	startAttempt,
	startEnrollment,
	submitAttempt,
} from "../lib/learning";

const idParams = z.object({ id: z.string().min(1).max(100) });
const chapterParams = idParams.extend({
	chapterId: z.string().min(1).max(100),
});

const attemptParams = idParams.extend({
	attemptId: z.string().min(1).max(100),
});
const submitBody = z.object({
	// Chosen option ids by question id; a question left out counts as unanswered.
	answers: z
		.record(z.string().max(100), z.array(z.string().max(100)).max(20))
		.refine((answers) => Object.keys(answers).length <= 200),
});

const attemptRefusals = {
	NOT_ACTIVE: "This enrollment is no longer in progress",
	LOCKED: "This chapter is locked",
	NO_QUIZ: "This chapter has no quiz",
	EXAM_ALREADY_TAKEN: "The final exam can only be taken once",
	ALREADY_SUBMITTED: "This attempt was already submitted",
} as const;

const completeRefusals = {
	NOT_ACTIVE: "This enrollment is no longer in progress",
	LOCKED: "This chapter is locked",
	QUIZ_NOT_PASSED: "The quiz of this chapter must be passed first",
	FINAL_EXAM: "The final exam is completed by passing it",
} as const;

/**
 * The learner side of a course: its sheet, the enrollment and the player. A learner only ever receives
 * `LearnerContent` (no quiz question, so no answer); the rules of what they may open live in `lib/learning.ts`.
 */
export const learningRoutes: FastifyPluginAsync = async (app) => {
	app.get(
		"/api/me/enrollments",
		{ preHandler: app.requireAuth },
		async (request): Promise<{ enrollments: MyEnrollment[] }> => ({
			enrollments: await listMyEnrollments(await getCourseActor(request)),
		}),
	);

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

	// Moves the learner to the revision published now (see `migrateEnrollment`).
	app.post(
		"/api/enrollments/:id/migrate",
		{ preHandler: app.requireAuth },
		async (request, reply) => {
			const { id } = idParams.parse(request.params);
			const actor = await getCourseActor(request);
			const result = await migrateOwnEnrollment(actor, id);
			if (!result.ok) {
				if (result.reason === "NOT_FOUND")
					return reply.code(404).send({ error: "Enrollment not found" });
				return reply.code(409).send({
					error:
						result.reason === "NOT_ACTIVE"
							? "This enrollment is no longer in progress"
							: "This enrollment is already on the latest revision",
					code: result.reason,
				});
			}
			const { migration } = result;
			await recordEvent(
				{
					type: "enrollment.migrate",
					actor: { id: actor.id, label: actor.label },
					target: {
						type: "enrollment",
						id: migration.toEnrollmentId,
						label: result.courseName,
					},
					metadata: migrationMetadata(migration),
				},
				request.log,
			);
			return reply.code(201).send({ enrollment: result.enrollment });
		},
	);

	app.post(
		"/api/enrollments/:id/chapters/:chapterId/complete",
		{ preHandler: app.requireAuth },
		async (request, reply) => {
			const { id, chapterId } = chapterParams.parse(request.params);
			const actor = await getCourseActor(request);
			const result = await completeChapter(actor, id, chapterId);
			if (!result.ok) {
				if (result.reason === "NOT_FOUND")
					return reply.code(404).send({ error: "Enrollment not found" });
				if (result.reason === "UNKNOWN_CHAPTER")
					return reply.code(404).send({ error: "Chapter not found" });
				return reply.code(409).send({
					error: completeRefusals[result.reason],
					code: result.reason,
				});
			}
			if (result.finished)
				await recordEvent(
					{
						type: "enrollment.complete",
						actor: { id: actor.id, label: actor.label },
						target: { type: "enrollment", id, label: result.courseName },
						metadata: {
							courseId: result.courseId,
							revisionKey: result.revisionKey,
						},
					},
					request.log,
				);
			return { finished: result.finished };
		},
	);

	app.post(
		"/api/enrollments/:id/chapters/:chapterId/attempts",
		{ preHandler: app.requireAuth },
		async (
			request,
			reply,
		): Promise<{ attempt: LearnerAttempt } | undefined> => {
			const { id, chapterId } = chapterParams.parse(request.params);
			const result = await startAttempt(
				await getCourseActor(request),
				id,
				chapterId,
			);
			if (!result.ok) {
				if (result.reason === "NOT_FOUND")
					return reply.code(404).send({ error: "Enrollment not found" });
				if (result.reason === "UNKNOWN_CHAPTER")
					return reply.code(404).send({ error: "Chapter not found" });
				return reply
					.code(409)
					.send({ error: attemptRefusals[result.reason], code: result.reason });
			}
			return { attempt: result.attempt };
		},
	);

	app.post(
		"/api/enrollments/:id/attempts/:attemptId/submit",
		{ preHandler: app.requireAuth },
		async (request, reply): Promise<{ result: AttemptResult } | undefined> => {
			const { id, attemptId } = attemptParams.parse(request.params);
			const { answers } = submitBody.parse(request.body);
			const actor = await getCourseActor(request);
			const outcome = await submitAttempt(actor, id, attemptId, answers);
			if (!outcome.ok) {
				if (outcome.reason === "NOT_FOUND")
					return reply.code(404).send({ error: "Attempt not found" });
				if (outcome.reason === "INVALID_ANSWERS")
					return reply.code(400).send({ error: outcome.message });
				return reply.code(409).send({
					error: attemptRefusals[outcome.reason],
					code: outcome.reason,
				});
			}
			if (outcome.ended)
				await recordEvent(
					{
						type:
							outcome.ended === "completed"
								? "enrollment.complete"
								: "enrollment.fail",
						actor: { id: actor.id, label: actor.label },
						target: { type: "enrollment", id, label: outcome.courseName },
						metadata: {
							courseId: outcome.courseId,
							revisionKey: outcome.revisionKey,
							score: outcome.result.score,
						},
					},
					request.log,
				);
			return { result: outcome.result };
		},
	);
};
