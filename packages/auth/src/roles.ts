import { createAccessControl } from "better-auth/plugins/access";
import {
	adminAc,
	defaultStatements,
	userAc,
} from "better-auth/plugins/admin/access";

// Pure module (no server/db imports): shared by the API, the Better Auth config and the browser.
//
// A user can hold several roles at once. Better Auth stores them in `user.role` as a comma separated
// string ("admin,writer"); everywhere else in the code base roles are a `Role[]`.

export const ROLES = ["user", "writer", "admin"] as const;
export type Role = (typeof ROLES)[number];

/** Access control declared to the Better Auth admin plugin (server and client). Only `admin` has admin permissions. */
export const accessControl = createAccessControl(defaultStatements);
export const roleDefinitions = {
	user: accessControl.newRole(userAc.statements),
	writer: accessControl.newRole({}),
	admin: accessControl.newRole(adminAc.statements),
};

const isRole = (value: string): value is Role =>
	(ROLES as readonly string[]).includes(value);

/** "admin, writer" -> ["admin", "writer"]. Unknown values are dropped, nothing left means plain `user`. */
export function parseRoles(value: string | null | undefined): Role[] {
	const roles = (value ?? "")
		.split(",")
		.map((role) => role.trim())
		.filter(isRole);
	return roles.length > 0 ? [...new Set(roles)] : ["user"];
}

/** Inverse of `parseRoles`, in canonical order. */
export function serializeRoles(roles: readonly Role[]): string {
	return ROLES.filter((role) => roles.includes(role)).join(",");
}

export const isAdmin = (roles: readonly Role[]) => roles.includes("admin");

/** The writer area is open to writers and, implicitly, to admins. */
export const canWrite = (roles: readonly Role[]) =>
	roles.includes("writer") || roles.includes("admin");
