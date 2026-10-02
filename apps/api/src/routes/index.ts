import type { PublicUser } from "@youlearn/types";
import type { FastifyPluginAsync } from "fastify";
import { getUserGroups } from "../lib/groups";
import { adminGroupRoutes } from "./admin/groups";
import { adminUserRoutes } from "./admin/users";

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
				role: role ?? "user",
				groups: await getUserGroups(id),
			};
			return { user };
		},
	);

	await app.register(adminGroupRoutes);
	await app.register(adminUserRoutes);
};
