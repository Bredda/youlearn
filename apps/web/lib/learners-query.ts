import type { CourseEnrollmentQuery } from "@youlearn/types";
import z from "zod";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from "@/lib/users-query";

const schema = z.object({
	q: z.string().trim().min(1).max(100).optional().catch(undefined),
	status: z
		.enum(["in_progress", "completed", "failed"])
		.optional()
		.catch(undefined),
	// Only ever present as `outdated=true` in the URL.
	outdated: z
		.literal("true")
		.optional()
		.catch(undefined)
		.transform((value) => (value === "true" ? true : undefined)),
	sort: z.enum(["startedAt", "learner", "status"]).catch("startedAt"),
	order: z.enum(["asc", "desc"]).catch("desc"),
	page: z.coerce.number().int().min(1).catch(1),
	pageSize: z.coerce
		.number()
		.int()
		.refine((n) => PAGE_SIZES.includes(n))
		.catch(DEFAULT_PAGE_SIZE),
});

/** Reads the learners table state from the page's search params; anything invalid falls back to its default. */
export function parseLearnersQuery(
	searchParams: Record<string, string | string[] | undefined>,
): CourseEnrollmentQuery {
	const first = (value: string | string[] | undefined) =>
		Array.isArray(value) ? value[0] : value;
	return schema.parse(
		Object.fromEntries(
			Object.entries(searchParams).map(([key, value]) => [key, first(value)]),
		),
	);
}

/** Inverse of `parseLearnersQuery`: defaults are omitted so URLs stay short. Same names are used for the API. */
export function learnersQueryToSearchParams(
	query: CourseEnrollmentQuery,
): URLSearchParams {
	const params = new URLSearchParams();
	if (query.q) params.set("q", query.q);
	if (query.status) params.set("status", query.status);
	if (query.outdated) params.set("outdated", "true");
	if (query.sort !== "startedAt") params.set("sort", query.sort);
	if (query.order !== "desc") params.set("order", query.order);
	if (query.page > 1) params.set("page", String(query.page));
	if (query.pageSize !== DEFAULT_PAGE_SIZE)
		params.set("pageSize", String(query.pageSize));
	return params;
}
