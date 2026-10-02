import {
	and,
	asc,
	count,
	db,
	desc,
	eq,
	ilike,
	like,
	or,
	schema,
	sql,
} from "@youlearn/db";
import { EVENT_FILTERS } from "@youlearn/events";
import type { AdminEventPage } from "@youlearn/types";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { escapeLike } from "../../lib/sql";

const { event } = schema;

const query = z.object({
	q: z.string().trim().max(100).optional(),
	type: z.enum(EVENT_FILTERS).optional(),
	sort: z.enum(["createdAt", "type", "actor", "target"]).default("createdAt"),
	order: z.enum(["asc", "desc"]).default("desc"),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const sortColumns = {
	createdAt: event.createdAt,
	type: event.type,
	actor: sql`lower(${event.actorLabel})`,
	target: sql`lower(${event.targetLabel})`,
};

/** Read access to the event log, admin only. Events are written by the features themselves (`recordEvent`). */
export const adminEventRoutes: FastifyPluginAsync = async (app) => {
	app.addHook("preHandler", app.requireAdmin);

	app.get("/api/admin/events", async (request): Promise<AdminEventPage> => {
		const { q, type, sort, order, page, pageSize } = query.parse(request.query);
		const search = q ? `%${escapeLike(q)}%` : undefined;
		const where = and(
			search
				? or(ilike(event.actorLabel, search), ilike(event.targetLabel, search))
				: undefined,
			// "user.create" is one type, "user" stands for all the types of the feature.
			type
				? type.includes(".")
					? eq(event.type, type)
					: like(event.type, `${type}.%`)
				: undefined,
		);
		const direction = order === "asc" ? asc : desc;

		const [{ total = 0 } = {}] = await db
			.select({ total: count() })
			.from(event)
			.where(where);
		const rows = await db
			.select()
			.from(event)
			.where(where)
			.orderBy(
				direction(sortColumns[sort]),
				desc(event.createdAt),
				asc(event.id),
			)
			.limit(pageSize)
			.offset((page - 1) * pageSize);

		return {
			events: rows.map((row) => ({
				...row,
				createdAt: row.createdAt.toISOString(),
			})),
			total,
			page,
			pageSize,
		};
	});
};
