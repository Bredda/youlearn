"use client";

import type { ReactTable, RowData } from "@tanstack/react-table";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { DataTableFeatures } from "./features";

export function DataTablePagination<TData extends RowData>({
	table,
	pageSizeOptions = [10, 20, 50, 100],
}: {
	table: ReactTable<DataTableFeatures, TData>;
	pageSizeOptions?: number[];
}) {
	const { pageIndex, pageSize } = table.state.pagination;
	const total = table.getRowCount();

	return (
		<div className="flex flex-wrap items-center justify-between gap-4 text-sm">
			<span className="text-muted-foreground">
				{total} résultat{total > 1 ? "s" : ""}
			</span>
			<div className="flex flex-wrap items-center gap-6">
				<div className="flex items-center gap-2">
					<span className="text-muted-foreground">Lignes par page</span>
					<Select
						value={String(pageSize)}
						onValueChange={(value) => table.setPageSize(Number(value))}
						items={pageSizeOptions.map((size) => ({
							value: String(size),
							label: String(size),
						}))}
					>
						<SelectTrigger className="w-20" aria-label="Lignes par page">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{pageSizeOptions.map((size) => (
								<SelectItem key={size} value={String(size)}>
									{size}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<span>
					Page {pageIndex + 1} sur {Math.max(1, table.getPageCount())}
				</span>
				<div className="flex items-center gap-1">
					<Button
						variant="outline"
						size="icon"
						aria-label="Première page"
						disabled={!table.getCanPreviousPage()}
						onClick={() => table.firstPage()}
					>
						<Icon name="firstPage" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						aria-label="Page précédente"
						disabled={!table.getCanPreviousPage()}
						onClick={() => table.previousPage()}
					>
						<Icon name="previousPage" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						aria-label="Page suivante"
						disabled={!table.getCanNextPage()}
						onClick={() => table.nextPage()}
					>
						<Icon name="nextPage" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						aria-label="Dernière page"
						disabled={!table.getCanNextPage()}
						onClick={() => table.lastPage()}
					>
						<Icon name="lastPage" />
					</Button>
				</div>
			</div>
		</div>
	);
}
