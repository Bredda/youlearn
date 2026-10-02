"use client";

import { Refresh01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
	type OnChangeFn,
	type PaginationState,
	type SortingState,
	useTable,
} from "@tanstack/react-table";
import type { AdminEventPage, AdminEventQuery } from "@youlearn/types";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { eventColumns } from "@/components/admin/events-columns";
import { EventsToolbar } from "@/components/admin/events-toolbar";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { dataTableFeatures } from "@/components/data-table/features";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { eventsQueryToSearchParams } from "@/lib/events-query";
import { DEFAULT_PAGE_SIZE } from "@/lib/users-query";

type Props = AdminEventPage & {
	/** Table state, read from the URL by the page. */
	query: AdminEventQuery;
};

export function EventsManager({ events, total, query }: Props) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const sorting: SortingState = [
		{ id: query.sort, desc: query.order === "desc" },
	];
	const pagination: PaginationState = {
		pageIndex: query.page - 1,
		pageSize: query.pageSize,
	};

	/** Sorting, filtering and pagination are done by the API: the table state lives in the URL. */
	function navigate(patch: Partial<AdminEventQuery>) {
		const next = { ...query, ...patch };
		if (!("page" in patch)) next.page = 1; // any other change goes back to the first page
		const params = eventsQueryToSearchParams(next);
		startTransition(() =>
			router.push(`/admin/events${params.size ? `?${params}` : ""}`),
		);
	}

	const onSortingChange: OnChangeFn<SortingState> = (updater) => {
		const [sort] = typeof updater === "function" ? updater(sorting) : updater;
		if (sort) {
			navigate({
				sort: sort.id as AdminEventQuery["sort"],
				order: sort.desc ? "desc" : "asc",
			});
		}
	};

	const onPaginationChange: OnChangeFn<PaginationState> = (updater) => {
		const next = typeof updater === "function" ? updater(pagination) : updater;
		if (next.pageSize !== pagination.pageSize) {
			navigate({ pageSize: next.pageSize, page: 1 });
		} else {
			navigate({ page: next.pageIndex + 1 });
		}
	};

	const table = useTable({
		features: dataTableFeatures,
		columns: eventColumns,
		data: events,
		getRowId: (event) => event.id,
		manualSorting: true,
		manualPagination: true,
		rowCount: total,
		enableMultiSort: false,
		enableSortingRemoval: false,
		autoResetPageIndex: false,
		state: { sorting, pagination },
		onSortingChange,
		onPaginationChange,
	});

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="font-semibold text-xl">Événements</h1>
					<p className="text-muted-foreground text-sm">
						Journal des actions : qui a fait quoi, et quand.
					</p>
				</div>
				<Button
					variant="outline"
					disabled={isPending}
					onClick={() => startTransition(() => router.refresh())}
				>
					{isPending ? (
						<Spinner />
					) : (
						<HugeiconsIcon icon={Refresh01Icon} strokeWidth={2} />
					)}
					Actualiser
				</Button>
			</div>

			<EventsToolbar
				key={query.q ?? ""}
				query={query}
				onChange={navigate}
				onReset={() =>
					navigate({
						q: undefined,
						type: undefined,
						sort: "createdAt",
						order: "desc",
						pageSize: DEFAULT_PAGE_SIZE,
					})
				}
			/>

			<div className={isPending ? "opacity-60 transition-opacity" : undefined}>
				<DataTable table={table} emptyMessage="Aucun événement." />
			</div>

			<DataTablePagination table={table} />
		</div>
	);
}
