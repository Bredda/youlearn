import type { CatalogQuery } from "@youlearn/types";
import z from "zod";

export const CATALOG_PAGE_SIZES = [12, 24, 48];
export const CATALOG_DEFAULT_PAGE_SIZE = 12;

const optionalText = z
	.string()
	.trim()
	.min(1)
	.max(100)
	.optional()
	.catch(undefined);

const schema = z.object({
	q: optionalText,
	category: optionalText,
	groupId: optionalText,
	status: z
		.enum(["in_progress", "completed", "failed", "none"])
		.optional()
		.catch(undefined),
	sort: z.enum(["name", "publishedAt"]).catch("publishedAt"),
	order: z.enum(["asc", "desc"]).catch("desc"),
	page: z.coerce.number().int().min(1).catch(1),
	pageSize: z.coerce
		.number()
		.int()
		.refine((n) => CATALOG_PAGE_SIZES.includes(n))
		.catch(CATALOG_DEFAULT_PAGE_SIZE),
});

/** Reads the catalog state from the page's search params; anything invalid falls back to its default. */
export function parseCatalogQuery(
	searchParams: Record<string, string | string[] | undefined>,
): CatalogQuery {
	const first = (value: string | string[] | undefined) =>
		Array.isArray(value) ? value[0] : value;
	return schema.parse(
		Object.fromEntries(
			Object.entries(searchParams).map(([key, value]) => [key, first(value)]),
		),
	);
}

/** Inverse of `parseCatalogQuery`: defaults are omitted so URLs stay short. Same names are used for the API. */
export function catalogQueryToSearchParams(
	query: CatalogQuery,
): URLSearchParams {
	const params = new URLSearchParams();
	if (query.q) params.set("q", query.q);
	if (query.category) params.set("category", query.category);
	if (query.groupId) params.set("groupId", query.groupId);
	if (query.status) params.set("status", query.status);
	if (query.sort !== "publishedAt") params.set("sort", query.sort);
	if (query.order !== "desc") params.set("order", query.order);
	if (query.page > 1) params.set("page", String(query.page));
	if (query.pageSize !== CATALOG_DEFAULT_PAGE_SIZE)
		params.set("pageSize", String(query.pageSize));
	return params;
}
