"use client";

import type { ReactTable, RowData } from "@tanstack/react-table";
import { Pagination } from "@/components/pagination";
import type { DataTableFeatures } from "./features";

/** Pagination of a server-side table: the generic `Pagination` bound to the table state. */
export function DataTablePagination<TData extends RowData>({
	table,
	pageSizeOptions = [10, 20, 50, 100],
}: {
	table: ReactTable<DataTableFeatures, TData>;
	pageSizeOptions?: number[];
}) {
	const { pageIndex, pageSize } = table.state.pagination;

	return (
		<Pagination
			total={table.getRowCount()}
			pageIndex={pageIndex}
			pageSize={pageSize}
			pageSizeOptions={pageSizeOptions}
			onPageChange={(index) => table.setPageIndex(index)}
			onPageSizeChange={(size) => table.setPageSize(size)}
		/>
	);
}
