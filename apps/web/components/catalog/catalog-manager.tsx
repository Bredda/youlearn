"use client";

import type { CatalogPage, CatalogQuery } from "@youlearn/types";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CatalogToolbar } from "@/components/catalog/catalog-toolbar";
import { CourseCard } from "@/components/catalog/course-card";
import { PendingIcon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import {
	CATALOG_DEFAULT_PAGE_SIZE,
	CATALOG_PAGE_SIZES,
	catalogQueryToSearchParams,
} from "@/lib/catalog-query";

type Props = CatalogPage & {
	/** Catalog state, read from the URL by the page. */
	query: CatalogQuery;
};

export function CatalogManager({
	courses,
	total,
	categories,
	groups,
	query,
}: Props) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	/** Sorting, filtering and pagination are done by the API: the state lives in the URL. */
	function navigate(patch: Partial<CatalogQuery>) {
		const next = { ...query, ...patch };
		if (!("page" in patch)) next.page = 1; // any other change goes back to the first page
		const params = catalogQueryToSearchParams(next);
		startTransition(() =>
			router.push(`/courses${params.size ? `?${params}` : ""}`),
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<PageHeader
				title="Les cours"
				description="Les cours publiés auxquels vos groupes vous donnent accès."
			>
				<Button
					variant="outline"
					disabled={isPending}
					onClick={() => startTransition(() => router.refresh())}
				>
					<PendingIcon pending={isPending} name="refresh" />
					Actualiser
				</Button>
			</PageHeader>

			<CatalogToolbar
				key={query.q ?? ""}
				query={query}
				groups={groups}
				categories={categories}
				onChange={navigate}
				onReset={() =>
					navigate({
						q: undefined,
						category: undefined,
						groupId: undefined,
						status: undefined,
						sort: "publishedAt",
						order: "desc",
						pageSize: CATALOG_DEFAULT_PAGE_SIZE,
					})
				}
			/>

			<div className={isPending ? "opacity-60 transition-opacity" : undefined}>
				{courses.length === 0 ? (
					<p className="rounded-lg border py-12 text-center text-muted-foreground text-sm">
						Aucun cours.
					</p>
				) : (
					<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{courses.map((course) => (
							// A grid cell stretches the card, so the cards of a row share one height.
							<li key={course.id} className="grid">
								<CourseCard course={course} />
							</li>
						))}
					</ul>
				)}
			</div>

			<Pagination
				total={total}
				pageIndex={query.page - 1}
				pageSize={query.pageSize}
				pageSizeOptions={CATALOG_PAGE_SIZES}
				pageSizeLabel="Cours par page"
				onPageChange={(index) => navigate({ page: index + 1 })}
				onPageSizeChange={(pageSize) => navigate({ pageSize, page: 1 })}
			/>
		</div>
	);
}
