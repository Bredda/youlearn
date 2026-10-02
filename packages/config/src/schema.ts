import { z } from "zod";
import { isEmailDomainAllowed } from "./email-domain";

/** "a, b,,A" -> ["a", "b"]: trimmed, empty entries dropped, case-insensitive duplicates removed. */
const csvList = z
	.string()
	.default("")
	.transform((value) => {
		const seen = new Set<string>();
		return value
			.split(",")
			.map((item) => item.trim())
			.filter(
				(item) =>
					item && !seen.has(item.toLowerCase()) && seen.add(item.toLowerCase()),
			);
	});

/** A bare domain such as `acme.com` (no `@`, no scheme), lower-cased. */
const emailDomainSchema = z
	.string()
	.toLowerCase()
	.regex(
		/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/,
		"must be a bare domain like `acme.com` (no `@`)",
	);

/** Empty strings (`ADMIN_EMAIL=` in a .env file) are treated as unset. */
const optional = <T extends z.ZodType>(schema: T) =>
	z.preprocess(
		(value) => (value === "" ? undefined : value),
		schema.optional(),
	);

export const envSchema = z
	.object({
		NODE_ENV: z
			.enum(["development", "test", "production"])
			.default("development"),

		DATABASE_URL: z.url(),

		API_HOST: z.string().min(1).default("0.0.0.0"),
		API_PORT: z.coerce.number().int().min(1).max(65535).default(3001),
		/** Where the web app reaches the API (server side + Next.js rewrites). */
		API_URL: z.url().default("http://localhost:3001"),
		/** Public origin of the web app: Better Auth base URL, CORS and trusted origin. */
		WEB_URL: z.url().default("http://localhost:3000"),

		BETTER_AUTH_SECRET: z
			.string()
			.min(
				32,
				"must be at least 32 characters (try `openssl rand -base64 32`)",
			),

		/** First admin, created at API startup (or with `seed:admin`) when both email and password are set. */
		ADMIN_EMAIL: optional(z.email()),
		ADMIN_PASSWORD: optional(z.string().min(8)),
		ADMIN_NAME: z.string().min(1).default("Admin"),

		/** Groups created on first install (only when the group table is empty), then managed from the admin UI. */
		DEFAULT_GROUPS: csvList,

		/** Email domains accepted when creating a user, without the `@`. Empty = no restriction. */
		ALLOWED_EMAIL_DOMAINS: csvList.pipe(z.array(emailDomainSchema)),
	})
	.refine((env) => Boolean(env.ADMIN_EMAIL) === Boolean(env.ADMIN_PASSWORD), {
		path: ["ADMIN_PASSWORD"],
		message: "ADMIN_EMAIL and ADMIN_PASSWORD must be set together",
	})
	.refine(
		(env) =>
			!env.ADMIN_EMAIL ||
			isEmailDomainAllowed(env.ADMIN_EMAIL, env.ALLOWED_EMAIL_DOMAINS),
		{
			path: ["ADMIN_EMAIL"],
			message: "ADMIN_EMAIL domain must be listed in ALLOWED_EMAIL_DOMAINS",
		},
	);

export type Env = z.infer<typeof envSchema>;
