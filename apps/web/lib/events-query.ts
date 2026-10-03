import { EVENT_FILTERS } from "@youlearn/events";
import type { AdminEventQuery } from "@youlearn/types";
import z from "zod";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from "@/lib/users-query";

const schema = z.object({
	q: z.string().trim().min(1).max(100).optional().catch(undefined),
	type: z.enum(EVENT_FILTERS).optional().catch(undefined),
	sort: z.enum(["createdAt", "type", "actor", "target"]).catch("createdAt"),
	order: z.enum(["asc", "desc"]).catch("desc"),
	page: z.coerce.number().int().min(1).catch(1),
	pageSize: z.coerce
		.number()
		.int()
		.refine((n) => PAGE_SIZES.includes(n))
		.catch(DEFAULT_PAGE_SIZE),
});

/** Reads the events table state from the page's search params; anything invalid falls back to its default. */
export function parseEventsQuery(
	searchParams: Record<string, string | string[] | undefined>,
): AdminEventQuery {
	const first = (value: string | string[] | undefined) =>
		Array.isArray(value) ? value[0] : value;
	return schema.parse(
		Object.fromEntries(
			Object.entries(searchParams).map(([key, value]) => [key, first(value)]),
		),
	);
}

/** Inverse of `parseEventsQuery`: defaults are omitted so URLs stay short. Same names are used for the API. */
export function eventsQueryToSearchParams(
	query: AdminEventQuery,
): URLSearchParams {
	const params = new URLSearchParams();
	if (query.q) params.set("q", query.q);
	if (query.type) params.set("type", query.type);
	if (query.sort !== "createdAt") params.set("sort", query.sort);
	if (query.order !== "desc") params.set("order", query.order);
	if (query.page > 1) params.set("page", String(query.page));
	if (query.pageSize !== DEFAULT_PAGE_SIZE)
		params.set("pageSize", String(query.pageSize));
	return params;
}
