import { parseRoles } from "@youlearn/auth/roles";
import type { PublicUser } from "@youlearn/types";
import type { FastifyPluginAsync } from "fastify";
import { getUserGroups } from "../lib/groups";
import { adminEventRoutes } from "./admin/events";
import { adminGroupRoutes } from "./admin/groups";
import { adminUserRoutes } from "./admin/users";
import { assetRoutes } from "./assets";
import { catalogRoutes } from "./catalog";
import { learningRoutes } from "./learning";
import { reviewRoutes } from "./review";
import { writerCourseRoutes } from "./writer/courses";
import { writerRevisionRoutes } from "./writer/revisions";

export const routes: FastifyPluginAsync = async (app) => {
	app.get("/health", async () => ({ status: "ok" }));

	app.get(
		"/api/me",
		{ preHandler: app.requireAuth },
		async (request, reply) => {
			if (!request.auth) return reply.code(401).send({ error: "Unauthorized" });
			const { id, name, email, emailVerified, image, role } = request.auth.user;
			const user: PublicUser = {
				id,
				name,
				email,
				emailVerified,
				image: image ?? null,
				roles: parseRoles(role),
				groups: await getUserGroups(id),
			};
			return { user };
		},
	);

	await app.register(adminEventRoutes);
	await app.register(adminGroupRoutes);
	await app.register(adminUserRoutes);
	await app.register(writerCourseRoutes);
	await app.register(writerRevisionRoutes);
	await app.register(assetRoutes);
	await app.register(catalogRoutes);
	await app.register(learningRoutes);
	await app.register(reviewRoutes);
};
