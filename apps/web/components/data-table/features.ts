import {
	metaHelper,
	rowPaginationFeature,
	rowSortingFeature,
	tableFeatures,
} from "@tanstack/react-table";

export type DataTableColumnMeta = {
	/** Classes applied to the header and body cells of the column (width, alignment...). */
	className?: string;
};

/**
 * Features shared by our data tables: sorting and pagination, both executed by the API (`manual*` options),
 * so no client row model is registered.
 */
export const dataTableFeatures = tableFeatures({
	rowSortingFeature,
	rowPaginationFeature,
	columnMeta: metaHelper<DataTableColumnMeta>(),
});

export type DataTableFeatures = typeof dataTableFeatures;
