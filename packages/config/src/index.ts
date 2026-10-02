import { z } from "zod";
import { loadRootEnv } from "./load-env";
import { type Env, envSchema } from "./schema";

loadRootEnv();

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
	throw new Error(
		`Invalid environment variables:\n${z.prettifyError(parsed.error)}`,
	);
}

export const env: Readonly<Env> = Object.freeze(parsed.data);

export { emailDomain, isEmailDomainAllowed } from "./email-domain";
export { findWorkspaceRoot } from "./load-env";
export { type Env, envSchema } from "./schema";
