import type {
	CourseEnrollmentDetail,
	CourseEnrollmentPage,
} from "@youlearn/types";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { authorizeCourse } from "../../lib/courses";
import {
	findCourseEnrollmentDetail,
	listCourseEnrollments,
} from "../../lib/enrollments";

const courseParams = z.object({ id: z.string().min(1) });
const detailParams = courseParams.extend({ enrollmentId: z.string().min(1) });
const listQuery = z.object({
	q: z.string().trim().max(100).optional(),
	status: z.enum(["in_progress", "completed", "failed"]).optional(),
	// Query strings carry text: only the learners behind, or everybody.
	outdated: z
		.enum(["true", "false"])
		.optional()
		.transform((value) => value === "true"),
	sort: z.enum(["startedAt", "learner", "status"]).default("startedAt"),
	order: z.enum(["asc", "desc"]).default("desc"),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Who follows a course and how far they got, for the people who edit it (an admin: every course). It is the
 * trace of failures at the final exam: nothing here changes an enrollment.
 */
export const writerEnrollmentRoutes: FastifyPluginAsync = async (app) => {
	app.addHook("preHandler", app.requireWriter);

	app.get(
		"/api/writer/courses/:id/enrollments",
		async (request, reply): Promise<CourseEnrollmentPage | undefined> => {
			const { id } = courseParams.parse(request.params);
			if (!(await authorizeCourse(request, reply, id))) return;
			return listCourseEnrollments(id, listQuery.parse(request.query));
		},
	);

	app.get(
		"/api/writer/courses/:id/enrollments/:enrollmentId",
		async (request, reply): Promise<CourseEnrollmentDetail | undefined> => {
			const { id, enrollmentId } = detailParams.parse(request.params);
			if (!(await authorizeCourse(request, reply, id))) return;
			const detail = await findCourseEnrollmentDetail(id, enrollmentId);
			if (!detail)
				return reply.code(404).send({ error: "Enrollment not found" });
			return detail;
		},
	);
};
