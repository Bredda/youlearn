import { env } from "@youlearn/config";
import { db, eq, schema } from "@youlearn/db";
import { recordEvent } from "@youlearn/events/server";
import { auth } from "./auth";
import { isAdmin, parseRoles, serializeRoles } from "./roles";

type Logger = Pick<Console, "info" | "warn">;

/**
 * Makes sure the admin described by ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME exists. Idempotent:
 * - no ADMIN_* variables: nothing happens
 * - unknown email: the user is created with the `admin` role
 * - existing email: the account (and its password) is left untouched, only promoted to `admin` if needed
 */
export async function ensureAdminUser(
	logger: Logger = console,
): Promise<"disabled" | "created" | "promoted" | "exists"> {
	const {
		ADMIN_EMAIL: email,
		ADMIN_PASSWORD: password,
		ADMIN_NAME: name,
	} = env;
	if (!email || !password) return "disabled";

	const [existing] = await db
		.select()
		.from(schema.user)
		.where(eq(schema.user.email, email.toLowerCase()))
		.limit(1);

	if (!existing) {
		// No headers/request: this is a trusted server-side call, the admin plugin skips the permission check.
		await auth.api.createUser({
			body: { email, password, name, role: "admin" },
		});
		logger.info(`Admin user created (${email})`);
		return "created";
	}

	const roles = parseRoles(existing.role);
	if (!isAdmin(roles)) {
		// Keep the roles the account already has (writer...) and add admin.
		await db
			.update(schema.user)
			.set({ role: serializeRoles([...roles, "admin"]) })
			.where(eq(schema.user.id, existing.id));
		await recordEvent({
			type: "user.set-role",
			target: { type: "user", id: existing.id, label: existing.email },
			metadata: { from: roles, to: [...roles, "admin"] },
		});
		logger.info(`Existing user promoted to admin (${email})`);
		return "promoted";
	}

	return "exists";
}
