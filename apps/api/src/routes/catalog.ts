import type { CatalogPage } from "@youlearn/types";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { listCatalog } from "../lib/catalog";
import { getCourseActor } from "../lib/courses";

const listQuery = z.object({
	q: z.string().trim().max(100).optional(),
	category: z.string().trim().min(1).max(40).optional(),
	groupId: z.string().min(1).optional(),
	status: z.enum(["in_progress", "completed", "failed", "none"]).optional(),
	sort: z.enum(["name", "publishedAt"]).default("publishedAt"),
	order: z.enum(["asc", "desc"]).default("desc"),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce.number().int().min(1).max(100).default(12),
});

/** The learner catalog: published courses visible to the signed-in user. */
export const catalogRoutes: FastifyPluginAsync = async (app) => {
	app.get(
		"/api/courses",
		{ preHandler: app.requireAuth },
		async (request): Promise<CatalogPage> =>
			listCatalog(
				await getCourseActor(request),
				listQuery.parse(request.query),
			),
	);
};
