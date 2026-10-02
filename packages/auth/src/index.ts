import type { IncomingHttpHeaders } from "node:http";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth";

export { AUTH_BASE_PATH, type Auth, type AuthSession, auth } from "./auth";
export { ensureAdminUser } from "./seed-admin";
export { fromNodeHeaders };

/** Resolves the session from the cookies/headers of a Node (Fastify, Express...) request. */
export function getSession(headers: IncomingHttpHeaders) {
	return auth.api.getSession({ headers: fromNodeHeaders(headers) });
}
