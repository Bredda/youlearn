import type { EventType } from "@youlearn/events";
import { recordEvent } from "@youlearn/events/server";
import {
	createAuthMiddleware,
	getSessionFromCtx,
	isAPIError,
} from "better-auth/api";
import { parseRoles, serializeRoles } from "./roles";

// The admin UI mutates users by calling the Better Auth admin plugin straight from the browser, so this is the one
// place that sees every user mutation (UI, API, seed) together with who did it.

type Actor = { id: string; label: string } | null;
type UserSnapshot = {
	id: string;
	email: string;
	role?: string | null;
} & Record<string, unknown>;

/** Admin plugin endpoints that mutate a user, and the event they produce. */
const eventTypes: Record<string, EventType> = {
	"/admin/create-user": "user.create",
	"/admin/update-user": "user.update",
	"/admin/set-role": "user.set-role",
	"/admin/set-user-password": "user.set-password",
	"/admin/ban-user": "user.ban",
	"/admin/unban-user": "user.unban",
	"/admin/remove-user": "user.delete",
};

/** Who and what an endpoint is about, read before it runs (a deleted user can no longer be read afterwards). */
type Snapshot = { actor: Actor; target: UserSnapshot | null };
const snapshots = new WeakMap<object, Snapshot>();

const asRecord = (value: unknown): Record<string, unknown> =>
	typeof value === "object" && value !== null
		? (value as Record<string, unknown>)
		: {};

/** Keeps the log small: a changed field may be a big value (an image...). */
const brief = (value: unknown) =>
	value == null ? null : String(value).slice(0, 200);

/** Plugged as `hooks.before`: remembers who acts and on whom, for the `after` hook. */
export const beforeUserEvent = createAuthMiddleware(async (ctx) => {
	if (!ctx.path || !(ctx.path in eventTypes)) return;

	const session = await getSessionFromCtx(ctx);
	const userId = asRecord(ctx.body).userId;
	const target =
		typeof userId === "string"
			? ((await ctx.context.internalAdapter.findUserById(
					userId,
				)) as UserSnapshot | null)
			: null;
	snapshots.set(ctx.context, {
		actor: session ? { id: session.user.id, label: session.user.email } : null,
		target,
	});
});

/** Plugged as `hooks.after`: the endpoint has run, record it unless it failed. */
export const afterUserEvent = createAuthMiddleware(async (ctx) => {
	const type = ctx.path ? eventTypes[ctx.path] : undefined;
	if (!type || isAPIError(ctx.context.returned)) return;

	const { actor = null, target: before = null } =
		snapshots.get(ctx.context) ?? {};
	const body = asRecord(ctx.body);
	let target = before && { id: before.id, label: before.email };
	let metadata: Record<string, unknown> | undefined;

	switch (type) {
		case "user.create": {
			const created = asRecord(asRecord(ctx.context.returned).user);
			if (typeof created.id !== "string") return;
			target = { id: created.id, label: String(created.email) };
			metadata = { roles: parseRoles(String(created.role)) };
			break;
		}
		case "user.update": {
			const changes: Record<string, { from: unknown; to: unknown }> = {};
			for (const [key, value] of Object.entries(asRecord(body.data))) {
				if (brief(before?.[key]) !== brief(value)) {
					changes[key] = { from: brief(before?.[key]), to: brief(value) };
				}
			}
			if (Object.keys(changes).length === 0) return;
			metadata = { changes };
			break;
		}
		case "user.set-role": {
			const from = parseRoles(before?.role);
			const to = parseRoles(
				Array.isArray(body.role) ? body.role.join(",") : String(body.role),
			);
			if (serializeRoles(from) === serializeRoles(to)) return;
			metadata = { from, to };
			break;
		}
		case "user.ban":
			metadata = {
				reason: brief(body.banReason),
				expiresIn: body.banExpiresIn ?? null,
			};
			break;
	}
	if (!target) return;

	await recordEvent(
		{
			type,
			actor,
			target: { type: "user", ...target },
			metadata,
		},
		ctx.context.logger,
	);
});
