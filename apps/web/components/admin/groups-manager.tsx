"use client";

import type { GroupWithMemberCount } from "@youlearn/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GroupFormDialog } from "@/components/admin/group-form-dialog";
import { GroupRowActions } from "@/components/admin/group-row-actions";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { FormError } from "@/components/form-error";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { callApi } from "@/lib/api-client";

// `undefined` = closed, `null` = creating, a group = renaming it.
type Editing = GroupWithMemberCount | null | undefined;

export function GroupsManager({ groups }: { groups: GroupWithMemberCount[] }) {
	const router = useRouter();
	const [editing, setEditing] = useState<Editing>(undefined);
	const [deleting, setDeleting] = useState<GroupWithMemberCount>();
	const [error, setError] = useState<string>();

	function done() {
		setEditing(undefined);
		router.refresh();
	}

	return (
		<div className="flex flex-col gap-4">
			<PageHeader
				title="Groupes"
				description="Les groupes déterminent les cours et programmes visibles par chaque utilisateur."
			>
				<Button onClick={() => setEditing(null)}>
					<Icon name="add" />
					Nouveau groupe
				</Button>
			</PageHeader>

			{error && <FormError>{error}</FormError>}

			<Table className="table-fixed">
				<TableHeader>
					<TableRow>
						<TableHead>Nom</TableHead>
						<TableHead className="w-44">Membres</TableHead>
						<TableHead className="w-16 text-right">
							<span className="sr-only">Actions</span>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{groups.length === 0 && (
						<TableRow>
							<TableCell
								colSpan={3}
								className="text-center text-muted-foreground"
							>
								Aucun groupe.
							</TableCell>
						</TableRow>
					)}
					{groups.map((group) => (
						<TableRow key={group.id}>
							<TableCell className="truncate font-medium">
								{group.name}
								{group.system && (
									<Badge variant="secondary" className="ml-2">
										Système
									</Badge>
								)}
							</TableCell>
							<TableCell>
								{group.system ? "Tous les utilisateurs" : group.memberCount}
							</TableCell>
							<TableCell className="text-right">
								<GroupRowActions
									group={group}
									onAction={(action, target) => {
										if (action === "rename") return setEditing(target);
										setError(undefined);
										setDeleting(target);
									}}
								/>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			{editing !== undefined && (
				<GroupFormDialog
					group={editing ?? undefined}
					onClose={() => setEditing(undefined)}
					onDone={done}
				/>
			)}

			{deleting && (
				<ConfirmDeleteDialog
					title={`Supprimer le groupe « ${deleting.name} » ?`}
					description={`${
						deleting.memberCount
							? `${deleting.memberCount} utilisateur(s) en font partie et le perdront. `
							: ""
					}Cette action est définitive.`}
					expected={deleting.name}
					onConfirm={() =>
						callApi("DELETE", `/api/admin/groups/${deleting.id}`)
					}
					onClose={() => setDeleting(undefined)}
					onDone={() => {
						setDeleting(undefined);
						router.refresh();
					}}
				/>
			)}
		</div>
	);
}
