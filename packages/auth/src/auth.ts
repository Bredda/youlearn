import { env } from "@youlearn/config";
import {
	emailDomain,
	isEmailDomainAllowed,
} from "@youlearn/config/email-domain";
import { db, schema } from "@youlearn/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError } from "better-auth/api";
import { admin } from "better-auth/plugins";
import { accessControl, roleDefinitions } from "./roles";

export const AUTH_BASE_PATH = "/api/auth";

/** Rejects emails outside ALLOWED_EMAIL_DOMAINS, whatever the way the user is created or its email changed. */
function assertEmailAllowed(email: string) {
	if (isEmailDomainAllowed(email, env.ALLOWED_EMAIL_DOMAINS)) return;
	throw new APIError("BAD_REQUEST", {
		message: `Le domaine « ${emailDomain(email)} » n'est pas autorisé (domaines autorisés : ${env.ALLOWED_EMAIL_DOMAINS.join(", ")})`,
	});
}

export const auth = betterAuth({
	appName: "YouLearn",
	// The browser talks to the API through the web origin (Next.js rewrites `/api/*`), so that is the public base URL.
	baseURL: env.WEB_URL,
	basePath: AUTH_BASE_PATH,
	secret: env.BETTER_AUTH_SECRET,
	trustedOrigins: [env.WEB_URL],
	database: drizzleAdapter(db, { provider: "pg", schema }),
	emailAndPassword: {
		enabled: true,
		// Accounts are created by admins (admin plugin / seed script), never by visitors.
		disableSignUp: true,
		minPasswordLength: 8,
	},
	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					assertEmailAllowed(user.email);
				},
			},
			update: {
				before: async (data) => {
					if (data.email) assertEmailAllowed(data.email);
				},
			},
		},
	},
	plugins: [admin({ ac: accessControl, roles: roleDefinitions })],
});

export type Auth = typeof auth;
export type AuthSession = Auth["$Infer"]["Session"];
