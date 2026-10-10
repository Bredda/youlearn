"use client";

import { createColumnHelper } from "@tanstack/react-table";
import type { CourseEnrollment } from "@youlearn/types";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { DataTableFeatures } from "@/components/data-table/features";
import { Badge } from "@/components/ui/badge";
import {
	type LearnerAction,
	LearnerRowActions,
} from "@/components/writer/learner-row-actions";
import {
	ENROLLMENT_STATUS_LABELS,
	ENROLLMENT_STATUS_VARIANTS,
} from "@/lib/enrollments";

const helper = createColumnHelper<DataTableFeatures, CourseEnrollment>();

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
	dateStyle: "medium",
	timeZone: "UTC",
});

/** Columns of the learners table. Sortable column ids are the sort keys understood by the API. */
export function createLearnerColumns({
	onAction,
}: {
	onAction: (action: LearnerAction, enrollment: CourseEnrollment) => void;
}) {
	return helper.columns([
		helper.accessor((row) => row.learner.name, {
			id: "learner",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Apprenant" />
			),
			cell: ({ row }) => (
				<div className="min-w-0">
					<div className="truncate font-medium">
						{row.original.learner.name}
					</div>
					<div className="truncate text-muted-foreground text-xs">
						{row.original.learner.email}
					</div>
				</div>
			),
			meta: { className: "w-[30%]" },
		}),
		helper.accessor("status", {
			id: "status",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Statut" />
			),
			cell: ({ row }) => (
				<Badge variant={ENROLLMENT_STATUS_VARIANTS[row.original.status]}>
					{ENROLLMENT_STATUS_LABELS[row.original.status]}
				</Badge>
			),
		}),
		helper.display({
			id: "revision",
			header: "Révision",
			enableSorting: false,
			cell: ({ row }) => (
				<div className="flex flex-wrap items-center gap-1">
					<span className="text-muted-foreground text-xs">
						{row.original.revisionKey}
					</span>
					{row.original.outdated && (
						<Badge
							variant="destructive"
							title="Une révision plus récente est publiée : l'apprenant n'est pas passé dessus"
						>
							Pas à jour
						</Badge>
					)}
				</div>
			),
		}),
		helper.display({
			id: "progress",
			header: "Progression",
			enableSorting: false,
			cell: ({ row }) => (
				<span className="text-sm">
					{row.original.completedChapters} / {row.original.totalChapters}{" "}
					<span className="text-muted-foreground text-xs">chapitres</span>
				</span>
			),
		}),
		helper.display({
			id: "exam",
			header: "Examen final",
			enableSorting: false,
			cell: ({ row }) =>
				row.original.finalExamScore === null ? (
					<span className="text-muted-foreground text-xs">—</span>
				) : (
					<span className="text-sm">{row.original.finalExamScore} %</span>
				),
		}),
		helper.accessor("startedAt", {
			id: "startedAt",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Début" />
			),
			cell: ({ row }) => (
				<span className="text-muted-foreground text-xs">
					{dateFormat.format(new Date(row.original.startedAt))}
				</span>
			),
			meta: { className: "w-32" },
		}),
		helper.display({
			id: "actions",
			header: () => <span className="sr-only">Actions</span>,
			enableSorting: false,
			cell: ({ row }) => (
				<LearnerRowActions enrollment={row.original} onAction={onAction} />
			),
			meta: { className: "w-16 text-right" },
		}),
	]);
}
