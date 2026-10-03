"use client";

import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

/** Pagination controls driven by plain props, so tables and card grids look and behave the same. */
export function Pagination({
	total,
	pageIndex,
	pageSize,
	pageSizeOptions,
	pageSizeLabel = "Lignes par page",
	onPageChange,
	onPageSizeChange,
}: {
	total: number;
	/** Zero-based. */
	pageIndex: number;
	pageSize: number;
	pageSizeOptions: number[];
	pageSizeLabel?: string;
	onPageChange: (pageIndex: number) => void;
	onPageSizeChange: (pageSize: number) => void;
}) {
	const pageCount = Math.max(1, Math.ceil(total / pageSize));
	const canPrevious = pageIndex > 0;
	const canNext = pageIndex + 1 < pageCount;

	return (
		<div className="flex flex-wrap items-center justify-between gap-4 text-sm">
			<span className="text-muted-foreground">
				{total} résultat{total > 1 ? "s" : ""}
			</span>
			<div className="flex flex-wrap items-center gap-6">
				<div className="flex items-center gap-2">
					<span className="text-muted-foreground">{pageSizeLabel}</span>
					<Select
						value={String(pageSize)}
						onValueChange={(value) => onPageSizeChange(Number(value))}
						items={pageSizeOptions.map((size) => ({
							value: String(size),
							label: String(size),
						}))}
					>
						<SelectTrigger className="w-20" aria-label={pageSizeLabel}>
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
					Page {pageIndex + 1} sur {pageCount}
				</span>
				<div className="flex items-center gap-1">
					<Button
						variant="outline"
						size="icon"
						aria-label="Première page"
						disabled={!canPrevious}
						onClick={() => onPageChange(0)}
					>
						<Icon name="firstPage" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						aria-label="Page précédente"
						disabled={!canPrevious}
						onClick={() => onPageChange(pageIndex - 1)}
					>
						<Icon name="previousPage" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						aria-label="Page suivante"
						disabled={!canNext}
						onClick={() => onPageChange(pageIndex + 1)}
					>
						<Icon name="nextPage" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						aria-label="Dernière page"
						disabled={!canNext}
						onClick={() => onPageChange(pageCount - 1)}
					>
						<Icon name="lastPage" />
					</Button>
				</div>
			</div>
		</div>
	);
}
