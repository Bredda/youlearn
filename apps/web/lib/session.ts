import type { PublicUser } from "@youlearn/types";
import { headers } from "next/headers";
import { cache } from "react";
import { apiFetch } from "@/lib/api";

/**
 * Current user, resolved by the API from the request cookies (server components/layouts only).
 * Deduplicated per request.
 */
export const getCurrentUser = cache(async (): Promise<PublicUser | null> => {
	if (!(await headers()).get("cookie")) return null;

	const response = await apiFetch("/api/me");
	if (!response.ok) return null;

	const { user } = (await response.json()) as { user: PublicUser };
	return user;
});
