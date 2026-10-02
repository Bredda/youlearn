"use client";

import type { GroupWithMemberCount } from "@youlearn/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GroupFormDialog } from "@/components/admin/group-form-dialog";
import { FormError } from "@/components/form-error";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
	const [pending, setPending] = useState(false);

	function done() {
		setEditing(undefined);
		router.refresh();
	}

	async function onDelete() {
		if (!deleting) return;
		setPending(true);
		const message = await callApi("DELETE", `/api/admin/groups/${deleting.id}`);
		setPending(false);
		setDeleting(undefined);
		if (message) return setError(message);
		router.refresh();
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-xl">Groupes</h1>
					<p className="text-muted-foreground text-sm">
						Les groupes déterminent les cours et programmes visibles par chaque
						utilisateur.
					</p>
				</div>
				<Button onClick={() => setEditing(null)}>Nouveau groupe</Button>
			</div>

			{error && <FormError>{error}</FormError>}

			<Table className="table-fixed">
				<TableHeader>
					<TableRow>
						<TableHead>Nom</TableHead>
						<TableHead className="w-32">Membres</TableHead>
						<TableHead className="w-48 text-right">Actions</TableHead>
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
							</TableCell>
							<TableCell>{group.memberCount}</TableCell>
							<TableCell className="space-x-2 text-right">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setEditing(group)}
								>
									Renommer
								</Button>
								<Button
									variant="destructive"
									size="sm"
									onClick={() => {
										setError(undefined);
										setDeleting(group);
									}}
								>
									Supprimer
								</Button>
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

			<AlertDialog
				open={deleting !== undefined}
				onOpenChange={(open) => !open && setDeleting(undefined)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Supprimer le groupe « {deleting?.name} » ?
						</AlertDialogTitle>
						<AlertDialogDescription>
							{deleting?.memberCount
								? `${deleting.memberCount} utilisateur(s) en font partie et le perdront. `
								: ""}
							Cette action est définitive.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={onDelete}
							disabled={pending}
						>
							Supprimer
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
