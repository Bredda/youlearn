/** Browser-side call to the API (same origin, proxied by Next). Returns an error message, or null on success. */
export async function callApi(method: string, url: string, body?: unknown) {
	const response = await fetch(url, {
		method,
		headers: body ? { "Content-Type": "application/json" } : undefined,
		body: body ? JSON.stringify(body) : undefined,
	});
	if (response.ok) return null;
	const data = (await response.json().catch(() => null)) as {
		error?: string;
	} | null;
	return data?.error ?? "Une erreur est survenue";
}

/** Normalizes a Better Auth client result to an error message, or null on success. */
export function authError(result: { error: { message?: string } | null }) {
	return result.error
		? (result.error.message ?? "Une erreur est survenue")
		: null;
}

/** Like `callApi`, for a call whose response body matters. */
export async function fetchApi<T>(
	method: string,
	url: string,
): Promise<{ data: T; error: null } | { data: null; error: string }> {
	const response = await fetch(url, { method });
	if (response.ok) return { data: (await response.json()) as T, error: null };
	const data = (await response.json().catch(() => null)) as {
		error?: string;
	} | null;
	return { data: null, error: data?.error ?? "Une erreur est survenue" };
}
