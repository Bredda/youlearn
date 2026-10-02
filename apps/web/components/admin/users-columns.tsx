"use client";

import { createColumnHelper } from "@tanstack/react-table";
import type { AdminUser } from "@youlearn/types";
import {
	type UserAction,
	UserRowActions,
} from "@/components/admin/user-row-actions";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import type { DataTableFeatures } from "@/components/data-table/features";
import { Badge } from "@/components/ui/badge";

const helper = createColumnHelper<DataTableFeatures, AdminUser>();

/** Columns of the users table. Sortable column ids are the sort keys understood by the API. */
export function createUserColumns({
	currentUserId,
	onAction,
}: {
	currentUserId: string;
	onAction: (action: UserAction, user: AdminUser) => void;
}) {
	return helper.columns([
		helper.accessor("name", {
			id: "name",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Utilisateur" />
			),
			cell: ({ row }) => (
				<>
					<div className="truncate font-medium" title={row.original.name}>
						{row.original.name}
					</div>
					<div
						className="truncate text-muted-foreground text-xs"
						title={row.original.email}
					>
						{row.original.email}
					</div>
				</>
			),
			meta: { className: "w-[28%]" },
		}),
		helper.accessor("role", {
			id: "role",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Rôle" />
			),
			cell: ({ row }) => (
				<div className="flex flex-wrap gap-1">
					<Badge
						variant={row.original.role === "admin" ? "default" : "secondary"}
					>
						{row.original.role === "admin" ? "Admin" : "Utilisateur"}
					</Badge>
					{row.original.banned && (
						<Badge
							variant="destructive"
							title={row.original.banReason ?? undefined}
						>
							Banni
						</Badge>
					)}
				</div>
			),
			meta: { className: "w-44" },
		}),
		helper.display({
			id: "groups",
			header: "Groupes",
			enableSorting: false,
			cell: ({ row }) => (
				<div className="flex flex-wrap gap-1">
					{row.original.groups.length === 0 && (
						<span className="text-muted-foreground text-xs">—</span>
					)}
					{row.original.groups.map((group) => (
						<Badge key={group.id} variant="outline">
							{group.name}
						</Badge>
					))}
				</div>
			),
		}),
		helper.accessor("createdAt", {
			id: "createdAt",
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title="Créé le" />
			),
			cell: ({ row }) => (
				<span className="text-muted-foreground text-xs">
					{new Date(row.original.createdAt).toLocaleDateString("fr-FR", {
						timeZone: "UTC",
					})}
				</span>
			),
			meta: { className: "w-36" },
		}),
		helper.display({
			id: "actions",
			header: () => <span className="sr-only">Actions</span>,
			enableSorting: false,
			cell: ({ row }) => (
				<UserRowActions
					user={row.original}
					isSelf={row.original.id === currentUserId}
					onAction={onAction}
				/>
			),
			meta: { className: "w-16 text-right" },
		}),
	]);
}
