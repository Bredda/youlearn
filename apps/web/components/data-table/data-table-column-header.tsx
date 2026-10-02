"use client";

import {
	ArrowDown01Icon,
	ArrowUp01Icon,
	UnfoldMoreIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { Column, RowData } from "@tanstack/react-table";
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
			<HugeiconsIcon
				icon={
					sorted === "asc"
						? ArrowUp01Icon
						: sorted === "desc"
							? ArrowDown01Icon
							: UnfoldMoreIcon
				}
				strokeWidth={2}
				className={sorted ? undefined : "opacity-40"}
			/>
		</Button>
	);
}
