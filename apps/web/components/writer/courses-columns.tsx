"use client";

import { createColumnHelper } from "@tanstack/react-table";
import type { WriterCourse } from "@youlearn/types";
import Link from "next/link";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { DataTableFeatures } from "@/components/data-table/features";
import { Badge } from "@/components/ui/badge";
import {
	type CourseAction,
	CourseRowActions,
} from "@/components/writer/course-row-actions";
import { assetUrl } from "@/lib/asset-url";
import {
	REVISION_STATUS_LABELS,
	REVISION_STATUS_VARIANTS,
} from "@/lib/revisions";

const helper = createColumnHelper<DataTableFeatures, WriterCourse>();

/** Columns of the courses table. Sortable column ids are the sort keys understood by the API. */
export function createCourseColumns({
	onAction,
}: {
	onAction: (action: CourseAction, course: WriterCourse) => void;
}) {
	return helper.columns([
		helper.accessor("name", {
			id: "name",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Cours" />
			),
			cell: ({ row }) => {
				const course = row.original;
				return (
					<div className="flex items-center gap-3">
						{course.imageAssetId && (
							// biome-ignore lint/performance/noImgElement: asset URLs are API routes, not optimizable by next/image
							<img
								src={assetUrl(course.id, course.imageAssetId)}
								alt=""
								className="size-10 shrink-0 rounded object-cover"
							/>
						)}
						<div className="min-w-0">
							<Link
								href={`/writer/courses/${course.id}`}
								className="block truncate font-medium hover:underline"
								title={course.name}
							>
								{course.name}
							</Link>
							<div
								className="truncate text-muted-foreground text-xs"
								title={course.slug}
							>
								{course.slug}
							</div>
						</div>
					</div>
				);
			},
			meta: { className: "w-[28%]" },
		}),
		helper.display({
			id: "categories",
			header: "Catégories",
			enableSorting: false,
			cell: ({ row }) => (
				<div className="flex flex-wrap gap-1">
					{row.original.categories.length === 0 && (
						<span className="text-muted-foreground text-xs">—</span>
					)}
					{row.original.categories.map((category) => (
						<Badge key={category} variant="outline">
							{category}
						</Badge>
					))}
				</div>
			),
		}),
		helper.display({
			id: "groups",
			header: "Groupes",
			enableSorting: false,
			cell: ({ row }) => (
				<div className="flex flex-wrap gap-1">
					{row.original.groups.map((group) => (
						<Badge key={group.id} variant="secondary">
							{group.name}
						</Badge>
					))}
				</div>
			),
		}),
		helper.display({
			id: "revisions",
			header: "Révisions",
			enableSorting: false,
			cell: ({ row }) => (
				<div className="flex flex-wrap gap-1">
					{(["published", "preview", "draft"] as const).map(
						(status) =>
							row.original.current[status] && (
								<Badge key={status} variant={REVISION_STATUS_VARIANTS[status]}>
									{REVISION_STATUS_LABELS[status]} ·{" "}
									{row.original.current[status].key}
								</Badge>
							),
					)}
				</div>
			),
		}),
		helper.accessor("updatedAt", {
			id: "updatedAt",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Modifié le" />
			),
			cell: ({ row }) => (
				<span className="text-muted-foreground text-xs">
					{new Date(row.original.updatedAt).toLocaleDateString("fr-FR", {
						timeZone: "UTC",
					})}
				</span>
			),
			meta: { className: "w-32" },
		}),
		helper.display({
			id: "actions",
			header: () => <span className="sr-only">Actions</span>,
			enableSorting: false,
			cell: ({ row }) => (
				<CourseRowActions course={row.original} onAction={onAction} />
			),
			meta: { className: "w-16 text-right" },
		}),
	]);
}
