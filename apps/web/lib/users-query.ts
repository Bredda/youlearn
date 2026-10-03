import { ROLES } from "@youlearn/auth/roles";
import type { AdminUserQuery } from "@youlearn/types";
import z from "zod";

export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZES = [10, 20, 50, 100];

const optionalText = z
	.string()
	.trim()
	.min(1)
	.max(100)
	.optional()
	.catch(undefined);

const schema = z.object({
	q: optionalText,
	role: z.enum(ROLES).optional().catch(undefined),
	status: z.enum(["active", "banned"]).optional().catch(undefined),
	groupId: optionalText,
	sort: z.enum(["name", "email", "role", "createdAt"]).catch("createdAt"),
	order: z.enum(["asc", "desc"]).catch("desc"),
	page: z.coerce.number().int().min(1).catch(1),
	pageSize: z.coerce
		.number()
		.int()
		.refine((n) => PAGE_SIZES.includes(n))
		.catch(DEFAULT_PAGE_SIZE),
});

/** Reads the users table state from the page's search params; anything invalid falls back to its default. */
export function parseUsersQuery(
	searchParams: Record<string, string | string[] | undefined>,
): AdminUserQuery {
	const first = (value: string | string[] | undefined) =>
		Array.isArray(value) ? value[0] : value;
	return schema.parse(
		Object.fromEntries(
			Object.entries(searchParams).map(([key, value]) => [key, first(value)]),
		),
	);
}

/** Inverse of `parseUsersQuery`: defaults are omitted so URLs stay short. Same names are used for the API. */
export function usersQueryToSearchParams(
	query: AdminUserQuery,
): URLSearchParams {
	const params = new URLSearchParams();
	if (query.q) params.set("q", query.q);
	if (query.role) params.set("role", query.role);
	if (query.status) params.set("status", query.status);
	if (query.groupId) params.set("groupId", query.groupId);
	if (query.sort !== "createdAt") params.set("sort", query.sort);
	if (query.order !== "desc") params.set("order", query.order);
	if (query.page > 1) params.set("page", String(query.page));
	if (query.pageSize !== DEFAULT_PAGE_SIZE)
		params.set("pageSize", String(query.pageSize));
	return params;
}
