import type { WriterCourseQuery } from "@youlearn/types";
import z from "zod";
import { DEFAULT_PAGE_SIZE, PAGE_SIZES } from "@/lib/users-query";

const optionalText = z
	.string()
	.trim()
	.min(1)
	.max(100)
	.optional()
	.catch(undefined);

const schema = z.object({
	q: optionalText,
	groupId: optionalText,
	category: optionalText,
	status: z
		.enum(["draft", "preview", "published", "none"])
		.optional()
		.catch(undefined),
	sort: z.enum(["name", "createdAt", "updatedAt"]).catch("updatedAt"),
	order: z.enum(["asc", "desc"]).catch("desc"),
	page: z.coerce.number().int().min(1).catch(1),
	pageSize: z.coerce
		.number()
		.int()
		.refine((n) => PAGE_SIZES.includes(n))
		.catch(DEFAULT_PAGE_SIZE),
});

/** Reads the courses table state from the page's search params; anything invalid falls back to its default. */
export function parseCoursesQuery(
	searchParams: Record<string, string | string[] | undefined>,
): WriterCourseQuery {
	const first = (value: string | string[] | undefined) =>
		Array.isArray(value) ? value[0] : value;
	return schema.parse(
		Object.fromEntries(
			Object.entries(searchParams).map(([key, value]) => [key, first(value)]),
		),
	);
}

/** Inverse of `parseCoursesQuery`: defaults are omitted so URLs stay short. Same names are used for the API. */
export function coursesQueryToSearchParams(
	query: WriterCourseQuery,
): URLSearchParams {
	const params = new URLSearchParams();
	if (query.q) params.set("q", query.q);
	if (query.groupId) params.set("groupId", query.groupId);
	if (query.category) params.set("category", query.category);
	if (query.status) params.set("status", query.status);
	if (query.sort !== "updatedAt") params.set("sort", query.sort);
	if (query.order !== "desc") params.set("order", query.order);
	if (query.page > 1) params.set("page", String(query.page));
	if (query.pageSize !== DEFAULT_PAGE_SIZE)
		params.set("pageSize", String(query.pageSize));
	return params;
}
