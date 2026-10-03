import { env } from "@youlearn/config";
import { asc, db, eq, schema, sql } from "@youlearn/db";
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
	// "Commun" is created by `ensureCommonGroup` and must not count as an existing group.
	if ((await db.$count(group, eq(group.system, false))) > 0) return;

	await db
		.insert(group)
		.values(env.DEFAULT_GROUPS.map((name) => ({ name })))
		.onConflictDoNothing();
	logger.info(`Default groups created (${env.DEFAULT_GROUPS.join(", ")})`);
}

export const COMMON_GROUP_NAME = "Commun";

/**
 * Makes sure the built-in "Commun" group exists: visible to everyone, so a course always has a group to be
 * public with. An admin-made group already called "Commun" is adopted rather than duplicated.
 */
export async function ensureCommonGroup(logger: {
	info: (message: string) => void;
}) {
	if ((await db.$count(group, eq(group.system, true))) > 0) return;

	const [adopted] = await db
		.update(group)
		.set({ system: true })
		.where(sql`lower(${group.name}) = lower(${COMMON_GROUP_NAME})`)
		.returning({ id: group.id });
	if (adopted)
		return logger.info(`Group "${COMMON_GROUP_NAME}" is now a system group`);

	await db.insert(group).values({ name: COMMON_GROUP_NAME, system: true });
	logger.info(`Group "${COMMON_GROUP_NAME}" created`);
}

const pgCode = (error: unknown): string | undefined => {
	const code = (e: unknown) => (e as { code?: string } | undefined)?.code;
	return code(error) ?? code((error as { cause?: unknown })?.cause);
};

/** Postgres unique violation, possibly wrapped by drizzle (`cause`). */
export const isUniqueViolation = (error: unknown) => pgCode(error) === "23505";

/** Postgres foreign key violation (a `restrict` reference still points at the row). */
export const isForeignKeyViolation = (error: unknown) =>
	pgCode(error) === "23503";
