"use client";

import {
	flexRender,
	type ReactTable,
	type RowData,
} from "@tanstack/react-table";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { DataTableFeatures } from "./features";

/**
 * Renders a TanStack table instance with shadcn's table primitives.
 * The layout is fixed: size columns through `meta.className` (e.g. `w-32`), one column left without width takes the rest.
 */
export function DataTable<TData extends RowData>({
	table,
	emptyMessage = "Aucun résultat.",
	className,
}: {
	table: ReactTable<DataTableFeatures, TData>;
	emptyMessage?: string;
	className?: string;
}) {
	const rows = table.getRowModel().rows;

	return (
		<Table className={cn("table-fixed", className)}>
			<TableHeader>
				{table.getHeaderGroups().map((headerGroup) => (
					<TableRow key={headerGroup.id}>
						{headerGroup.headers.map((header) => (
							<TableHead
								key={header.id}
								className={header.column.columnDef.meta?.className}
							>
								{header.isPlaceholder
									? null
									: flexRender(
											header.column.columnDef.header,
											header.getContext(),
										)}
							</TableHead>
						))}
					</TableRow>
				))}
			</TableHeader>
			<TableBody>
				{rows.length === 0 && (
					<TableRow>
						<TableCell
							colSpan={table.getAllLeafColumns().length}
							className="h-20 text-center text-muted-foreground"
						>
							{emptyMessage}
						</TableCell>
					</TableRow>
				)}
				{rows.map((row) => (
					<TableRow key={row.id}>
						{row.getAllCells().map((cell) => (
							<TableCell
								key={cell.id}
								className={cell.column.columnDef.meta?.className}
							>
								{flexRender(cell.column.columnDef.cell, cell.getContext())}
							</TableCell>
						))}
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
