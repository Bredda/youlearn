import { env } from "@youlearn/config";
import { headers } from "next/headers";

/** Server-side call to the API on behalf of the current visitor (their cookies are forwarded). */
export async function apiFetch(path: string, init?: RequestInit) {
	const cookie = (await headers()).get("cookie");
	return fetch(`${env.API_URL}${path}`, {
		...init,
		headers: { ...init?.headers, ...(cookie ? { cookie } : {}) },
		cache: "no-store",
	});
}
