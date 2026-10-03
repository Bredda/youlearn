import type { CatalogPage } from "@youlearn/types";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CatalogManager } from "@/components/catalog/catalog-manager";
import { apiFetch } from "@/lib/api";
import {
	catalogQueryToSearchParams,
	parseCatalogQuery,
} from "@/lib/catalog-query";

export const metadata: Metadata = { title: "Les cours" };

export default async function CatalogPageRoute({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const query = parseCatalogQuery(await searchParams);

	const response = await apiFetch(
		`/api/courses?${catalogQueryToSearchParams(query)}`,
	);
	if (!response.ok) throw new Error("Impossible de charger les cours");
	const page = (await response.json()) as CatalogPage;

	// The requested page no longer exists (e.g. a course was unpublished): go to the new last one.
	const pageCount = Math.max(1, Math.ceil(page.total / query.pageSize));
	if (query.page > pageCount) {
		const params = catalogQueryToSearchParams({ ...query, page: pageCount });
		redirect(`/courses${params.size ? `?${params}` : ""}`);
	}

	return <CatalogManager {...page} query={query} />;
}
