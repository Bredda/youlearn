"use client";

import { createColumnHelper } from "@tanstack/react-table";
import type { AdminEvent } from "@youlearn/types";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { DataTableFeatures } from "@/components/data-table/features";
import { Badge } from "@/components/ui/badge";
import { describeEvent, eventBadgeLabel } from "@/lib/events";

const helper = createColumnHelper<DataTableFeatures, AdminEvent>();

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
	dateStyle: "short",
	timeStyle: "medium",
	// Fixed zone so the server render and the browser agree.
	timeZone: "Europe/Paris",
});

/** Columns of the events table. Sortable column ids are the sort keys understood by the API. */
export const eventColumns = helper.columns([
	helper.accessor("createdAt", {
		id: "createdAt",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Date" />
		),
		cell: ({ row }) => (
			<span className="text-muted-foreground text-xs">
				{dateFormat.format(new Date(row.original.createdAt))}
			</span>
		),
		meta: { className: "w-44" },
	}),
	helper.accessor("type", {
		id: "type",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Événement" />
		),
		cell: ({ row }) => (
			<Badge variant="secondary">{eventBadgeLabel(row.original.type)}</Badge>
		),
		meta: { className: "w-56" },
	}),
	helper.accessor("actorLabel", {
		id: "actor",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Auteur" />
		),
		cell: ({ row }) =>
			row.original.actorLabel ? (
				<div className="truncate" title={row.original.actorLabel}>
					{row.original.actorLabel}
				</div>
			) : (
				<span className="text-muted-foreground">Système</span>
			),
		meta: { className: "w-[22%]" },
	}),
	helper.accessor("targetLabel", {
		id: "target",
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title="Cible" />
		),
		cell: ({ row }) =>
			row.original.targetLabel ? (
				<div className="truncate" title={row.original.targetLabel}>
					{row.original.targetLabel}
				</div>
			) : (
				<span className="text-muted-foreground">—</span>
			),
		meta: { className: "w-[22%]" },
	}),
	helper.display({
		id: "details",
		header: "Détails",
		enableSorting: false,
		cell: ({ row }) => {
			const details = describeEvent(row.original);
			return details ? (
				<div className="truncate text-xs" title={details}>
					{details}
				</div>
			) : (
				<span className="text-muted-foreground text-xs">—</span>
			);
		},
	}),
]);
