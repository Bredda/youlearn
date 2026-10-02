import { asc, count, db, eq, inArray, schema, sql } from "@youlearn/db";
import { recordEvent } from "@youlearn/events/server";
import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";
import { isUniqueViolation } from "../../lib/groups";

const { group, userGroup, user } = schema;

const nameBody = z.object({ name: z.string().trim().min(1).max(64) });
const idParams = z.object({ id: z.string().min(1) });
const userParams = z.object({ userId: z.string().min(1) });
const userGroupsBody = z.object({
	groupIds: z.array(z.string().min(1)).max(200),
});

/** Group CRUD and assignment, admin only. */
export const adminGroupRoutes: FastifyPluginAsync = async (app) => {
	app.addHook("preHandler", app.requireAdmin);

	const actorOf = (request: FastifyRequest) =>
		request.auth && {
			id: request.auth.user.id,
			label: request.auth.user.email,
		};

	app.get("/api/admin/groups", async () => {
		const groups = await db
			.select({
				id: group.id,
				name: group.name,
				memberCount: count(userGroup.userId),
			})
			.from(group)
			.leftJoin(userGroup, eq(userGroup.groupId, group.id))
			.groupBy(group.id)
			.orderBy(asc(sql`lower(${group.name})`));
		return { groups };
	});

	app.post("/api/admin/groups", async (request, reply) => {
		const { name } = nameBody.parse(request.body);
		try {
			const [created] = await db.insert(group).values({ name }).returning();
			if (created)
				await recordEvent(
					{
						type: "group.create",
						actor: actorOf(request),
						target: { type: "group", id: created.id, label: created.name },
					},
					request.log,
				);
			return reply.code(201).send({ group: created });
		} catch (error) {
			if (isUniqueViolation(error))
				return reply
					.code(409)
					.send({ error: "A group with this name already exists" });
			throw error;
		}
	});

	app.patch("/api/admin/groups/:id", async (request, reply) => {
		const { id } = idParams.parse(request.params);
		const { name } = nameBody.parse(request.body);
		try {
			const [previous] = await db
				.select({ name: group.name })
				.from(group)
				.where(eq(group.id, id));
			const [updated] = await db
				.update(group)
				.set({ name })
				.where(eq(group.id, id))
				.returning();
			if (!updated) return reply.code(404).send({ error: "Group not found" });
			if (previous?.name !== updated.name)
				await recordEvent(
					{
						type: "group.update",
						actor: actorOf(request),
						target: { type: "group", id, label: updated.name },
						metadata: { from: previous?.name ?? null, to: updated.name },
					},
					request.log,
				);
			return { group: updated };
		} catch (error) {
			if (isUniqueViolation(error))
				return reply
					.code(409)
					.send({ error: "A group with this name already exists" });
			throw error;
		}
	});

	app.delete("/api/admin/groups/:id", async (request, reply) => {
		const { id } = idParams.parse(request.params);
		const deleted = await db
			.delete(group)
			.where(eq(group.id, id))
			.returning({ id: group.id, name: group.name });
		const [removed] = deleted;
		if (!removed) return reply.code(404).send({ error: "Group not found" });
		await recordEvent(
			{
				type: "group.delete",
				actor: actorOf(request),
				target: { type: "group", id, label: removed.name },
			},
			request.log,
		);
		return reply.code(204).send();
	});

	app.get("/api/admin/users/:userId/groups", async (request) => {
		const { userId } = userParams.parse(request.params);
		const groups = await db
			.select({ id: group.id, name: group.name })
			.from(userGroup)
			.innerJoin(group, eq(group.id, userGroup.groupId))
			.where(eq(userGroup.userId, userId))
			.orderBy(asc(sql`lower(${group.name})`));
		return { groups };
	});

	// Replaces the whole set of groups of a user.
	app.put("/api/admin/users/:userId/groups", async (request, reply) => {
		const { userId } = userParams.parse(request.params);
		const groupIds = [...new Set(userGroupsBody.parse(request.body).groupIds)];

		const [target] = await db
			.select({ id: user.id, email: user.email })
			.from(user)
			.where(eq(user.id, userId))
			.limit(1);
		if (!target) return reply.code(404).send({ error: "User not found" });

		const known = groupIds.length
			? await db
					.select({ id: group.id, name: group.name })
					.from(group)
					.where(inArray(group.id, groupIds))
			: [];
		if (known.length !== groupIds.length)
			return reply.code(400).send({ error: "Unknown group id" });

		const previous = await db
			.select({ id: group.id, name: group.name })
			.from(userGroup)
			.innerJoin(group, eq(group.id, userGroup.groupId))
			.where(eq(userGroup.userId, userId));

		await db.transaction(async (tx) => {
			await tx.delete(userGroup).where(eq(userGroup.userId, userId));
			if (groupIds.length)
				await tx
					.insert(userGroup)
					.values(groupIds.map((groupId) => ({ userId, groupId })));
		});

		const names = (groups: { name: string }[]) =>
			groups.map((g) => g.name).sort((a, b) => a.localeCompare(b));
		// The user form always saves the groups: only log real changes.
		if (
			previous.length !== known.length ||
			previous.some((p) => !groupIds.includes(p.id))
		) {
			await recordEvent(
				{
					type: "user.set-groups",
					actor: actorOf(request),
					target: { type: "user", id: userId, label: target.email },
					metadata: { from: names(previous), to: names(known) },
				},
				request.log,
			);
		}

		return { groups: known.sort((a, b) => a.name.localeCompare(b.name)) };
	});
};
