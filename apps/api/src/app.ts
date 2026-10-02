import cors from "@fastify/cors";
import { env } from "@youlearn/config";
import Fastify from "fastify";
import { ZodError, z } from "zod";
import authPlugin from "./plugins/auth";
import { routes } from "./routes";

export async function buildApp() {
	const app = Fastify({
		logger: { level: env.NODE_ENV === "production" ? "info" : "debug" },
	});

	// The web app normally reaches us through its own origin (Next.js rewrites), CORS covers direct calls.
	await app.register(cors, { origin: [env.WEB_URL], credentials: true });
	app.setErrorHandler((error, _request, reply) => {
		if (error instanceof ZodError) {
			return reply
				.code(400)
				.send({ error: "Invalid request", details: z.prettifyError(error) });
		}
		return reply.send(error);
	});

	await app.register(authPlugin);
	await app.register(routes);

	return app;
}
