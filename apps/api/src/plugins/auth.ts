import {
	AUTH_BASE_PATH,
	type AuthSession,
	auth,
	fromNodeHeaders,
	getSession,
} from "@youlearn/auth";
import { canWrite, isAdmin, parseRoles } from "@youlearn/auth/roles";
import type { FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

declare module "fastify" {
	interface FastifyRequest {
		/** Set by `requireAuth`. */
		auth: AuthSession | null;
	}
	interface FastifyInstance {
		requireAdmin: (
			request: FastifyRequest,
			reply: FastifyReply,
		) => Promise<void>;
		requireAuth: (
			request: FastifyRequest,
			reply: FastifyReply,
		) => Promise<void>;
		/** Writers and admins. */
		requireWriter: (
			request: FastifyRequest,
			reply: FastifyReply,
		) => Promise<void>;
	}
}

export default fp(
	async (app) => {
		// Better Auth speaks the Fetch API: translate Fastify's request/reply to it and back.
		app.route({
			method: ["GET", "POST"],
			url: `${AUTH_BASE_PATH}/*`,
			async handler(request, reply) {
				const url = new URL(request.url, `http://${request.headers.host}`);
				const body =
					request.body == null ? undefined : JSON.stringify(request.body);
				const response = await auth.handler(
					new Request(url, {
						method: request.method,
						headers: fromNodeHeaders(request.headers),
						body,
					}),
				);

				reply.status(response.status);
				response.headers.forEach((value, key) => {
					if (key !== "set-cookie") reply.header(key, value);
				});
				const cookies = response.headers.getSetCookie();
				if (cookies.length > 0) reply.header("set-cookie", cookies);

				return reply.send(response.body ? await response.text() : null);
			},
		});

		app.decorateRequest("auth", null);

		app.decorate("requireAuth", async (request, reply) => {
			const session = await getSession(request.headers);
			if (!session) return reply.code(401).send({ error: "Unauthorized" });
			request.auth = session;
		});

		app.decorate("requireAdmin", async (request, reply) => {
			await app.requireAuth(request, reply);
			if (reply.sent) return;
			if (!isAdmin(parseRoles(request.auth?.user.role)))
				return reply.code(403).send({ error: "Forbidden" });
		});

		app.decorate("requireWriter", async (request, reply) => {
			await app.requireAuth(request, reply);
			if (reply.sent) return;
			if (!canWrite(parseRoles(request.auth?.user.role)))
				return reply.code(403).send({ error: "Forbidden" });
		});
	},
	{ name: "auth" },
);
