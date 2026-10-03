"use client";

import type { Column, RowData } from "@tanstack/react-table";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import type { DataTableFeatures } from "./features";

/** Column title that toggles the sort direction on click (plain text when the column is not sortable). */
export function DataTableColumnHeader<TData extends RowData, TValue>({
	column,
	title,
}: {
	column: Column<DataTableFeatures, TData, TValue>;
	title: string;
}) {
	if (!column.getCanSort()) return <span>{title}</span>;

	const sorted = column.getIsSorted();
	return (
		<Button
			variant="ghost"
			size="sm"
			className="-ml-2"
			onClick={() => column.toggleSorting(sorted === "asc")}
		>
			{title}
			<Icon
				name={
					sorted === "asc"
						? "sortAscending"
						: sorted === "desc"
							? "sortDescending"
							: "sortable"
				}
				className={sorted ? undefined : "opacity-40"}
			/>
		</Button>
	);
}
