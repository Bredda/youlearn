import { env } from "@youlearn/config";
import { asc, db, eq, schema } from "@youlearn/db";
import type { PublicGroup } from "@youlearn/types";

const { group, userGroup } = schema;

export async function getUserGroups(userId: string): Promise<PublicGroup[]> {
	return db
		.select({ id: group.id, name: group.name })
		.from(userGroup)
		.innerJoin(group, eq(group.id, userGroup.groupId))
		.where(eq(userGroup.userId, userId))
		.orderBy(asc(group.name));
}

/**
 * First install: creates the groups listed in DEFAULT_GROUPS, but only while no group exists.
 * Afterwards groups are owned by the admin UI, so deleting one never brings it back on restart.
 */
export async function ensureDefaultGroups(logger: {
	info: (message: string) => void;
}) {
	if (env.DEFAULT_GROUPS.length === 0) return;
	if ((await db.$count(group)) > 0) return;

	await db
		.insert(group)
		.values(env.DEFAULT_GROUPS.map((name) => ({ name })))
		.onConflictDoNothing();
	logger.info(`Default groups created (${env.DEFAULT_GROUPS.join(", ")})`);
}

/** Postgres unique violation, possibly wrapped by drizzle (`cause`). */
export function isUniqueViolation(error: unknown): boolean {
	const code = (e: unknown) => (e as { code?: string } | undefined)?.code;
	return (
		code(error) === "23505" ||
		code((error as { cause?: unknown })?.cause) === "23505"
	);
}
