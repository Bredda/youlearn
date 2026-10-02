import { parseRoles, ROLES } from "@youlearn/auth/roles";
import {
	and,
	asc,
	count,
	db,
	desc,
	eq,
	ilike,
	inArray,
	or,
	schema,
	sql,
} from "@youlearn/db";
import type { AdminUser, AdminUserPage } from "@youlearn/types";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const { user, group, userGroup } = schema;

const query = z.object({
	q: z.string().trim().max(100).optional(),
	role: z.enum(ROLES).optional(),
	status: z.enum(["active", "banned"]).optional(),
	groupId: z.string().min(1).optional(),
	sort: z.enum(["name", "email", "role", "createdAt"]).default("createdAt"),
	order: z.enum(["asc", "desc"]).default("desc"),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const sortColumns = {
	name: sql`lower(${user.name})`,
	email: sql`lower(${user.email})`,
	role: user.role,
	createdAt: user.createdAt,
};

/** Escapes LIKE wildcards so the search term is matched literally. */
const escapeLike = (value: string) =>
	value.replace(/[\\%_]/g, (char) => `\\${char}`);

/** User listing for the admin UI: Better Auth's `list-users` knows nothing about our groups. */
export const adminUserRoutes: FastifyPluginAsync = async (app) => {
	app.addHook("preHandler", app.requireAdmin);

	app.get("/api/admin/users", async (request): Promise<AdminUserPage> => {
		const { q, role, status, groupId, sort, order, page, pageSize } =
			query.parse(request.query);
		const search = q ? `%${escapeLike(q)}%` : undefined;
		const where = and(
			search
				? or(ilike(user.name, search), ilike(user.email, search))
				: undefined,
			// `role` holds a comma separated list ("admin,writer"): match any of them.
			role ? sql`${role} = ANY(string_to_array(${user.role}, ','))` : undefined,
			status ? eq(user.banned, status === "banned") : undefined,
			groupId
				? inArray(
						user.id,
						db
							.select({ id: userGroup.userId })
							.from(userGroup)
							.where(eq(userGroup.groupId, groupId)),
					)
				: undefined,
		);
		const direction = order === "asc" ? asc : desc;

		const [{ total = 0 } = {}] = await db
			.select({ total: count() })
			.from(user)
			.where(where);
		const rows = await db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				emailVerified: user.emailVerified,
				image: user.image,
				role: user.role,
				banned: user.banned,
				banReason: user.banReason,
				createdAt: user.createdAt,
			})
			.from(user)
			.where(where)
			.orderBy(direction(sortColumns[sort]), asc(user.id))
			.limit(pageSize)
			.offset((page - 1) * pageSize);

		const memberships = rows.length
			? await db
					.select({ userId: userGroup.userId, id: group.id, name: group.name })
					.from(userGroup)
					.innerJoin(group, eq(group.id, userGroup.groupId))
					.where(
						and(
							inArray(
								userGroup.userId,
								rows.map((row) => row.id),
							),
						),
					)
					.orderBy(asc(sql`lower(${group.name})`))
			: [];

		const users: AdminUser[] = rows.map(({ role, ...row }) => ({
			...row,
			roles: parseRoles(role),
			createdAt: row.createdAt.toISOString(),
			groups: memberships
				.filter((m) => m.userId === row.id)
				.map(({ id, name }) => ({ id, name })),
		}));

		return { users, total, page, pageSize };
	});
};
