"use client";

import {
	type OnChangeFn,
	type PaginationState,
	type SortingState,
	useTable,
} from "@tanstack/react-table";
import { authClient } from "@youlearn/auth/client";
import type {
	AdminUser,
	AdminUserPage,
	AdminUserQuery,
	GroupWithMemberCount,
} from "@youlearn/types";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import {
	BanDialog,
	PasswordDialog,
} from "@/components/admin/user-action-dialogs";
import { UserFormDialog } from "@/components/admin/user-form-dialog";
import type { UserAction } from "@/components/admin/user-row-actions";
import { createUserColumns } from "@/components/admin/users-columns";
import { UsersToolbar } from "@/components/admin/users-toolbar";
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { dataTableFeatures } from "@/components/data-table/features";
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
import { authError } from "@/lib/api-client";
import { usersQueryToSearchParams } from "@/lib/users-query";

type Dialog =
	| { type: "create" }
	| { type: "edit" | "password" | "ban" | "delete"; user: AdminUser }
	| undefined;

type Props = AdminUserPage & {
	/** Table state, read from the URL by the page. */
	query: AdminUserQuery;
	groups: GroupWithMemberCount[];
	currentUserId: string;
	/** Empty = no restriction. */
	allowedEmailDomains: string[];
};

export function UsersManager({
	users,
	total,
	query,
	groups,
	currentUserId,
	allowedEmailDomains,
}: Props) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [dialog, setDialog] = useState<Dialog>();
	const [error, setError] = useState<string>();

	const sorting: SortingState = [
		{ id: query.sort, desc: query.order === "desc" },
	];
	const pagination: PaginationState = {
		pageIndex: query.page - 1,
		pageSize: query.pageSize,
	};

	/** Sorting, filtering and pagination are done by the API: the table state lives in the URL. */
	function navigate(patch: Partial<AdminUserQuery>) {
		const next = { ...query, ...patch };
		if (!("page" in patch)) next.page = 1; // any other change goes back to the first page
		const params = usersQueryToSearchParams(next);
		startTransition(() =>
			router.push(`/admin/users${params.size ? `?${params}` : ""}`),
		);
	}

	const onSortingChange: OnChangeFn<SortingState> = (updater) => {
		const [sort] = typeof updater === "function" ? updater(sorting) : updater;
		if (sort) {
			navigate({
				sort: sort.id as AdminUserQuery["sort"],
				order: sort.desc ? "desc" : "asc",
			});
		}
	};

	const onPaginationChange: OnChangeFn<PaginationState> = (updater) => {
		const next = typeof updater === "function" ? updater(pagination) : updater;
		if (next.pageSize !== pagination.pageSize) {
			navigate({ pageSize: next.pageSize, page: 1 });
		} else {
			navigate({ page: next.pageIndex + 1 });
		}
	};

	function close() {
		setDialog(undefined);
	}

	function done() {
		close();
		router.refresh();
	}

	/** Runs an action that does not need a dialog (unban, delete). */
	const run = useCallback(
		async (action: Promise<{ error: { message?: string } | null }>) => {
			setError(undefined);
			const message = authError(await action);
			if (message) return setError(message);
			router.refresh();
		},
		[router],
	);

	const onAction = useCallback(
		(action: UserAction, user: AdminUser) => {
			if (action === "unban") {
				run(authClient.admin.unbanUser({ userId: user.id }));
			} else {
				setDialog({ type: action, user });
			}
		},
		[run],
	);

	async function confirmDelete(user: AdminUser) {
		close();
		await run(authClient.admin.removeUser({ userId: user.id }));
	}

	// Columns must keep a stable reference between renders.
	const columns = useMemo(
		() => createUserColumns({ currentUserId, onAction }),
		[currentUserId, onAction],
	);

	const table = useTable({
		features: dataTableFeatures,
		columns,
		data: users,
		getRowId: (user) => user.id,
		manualSorting: true,
		manualPagination: true,
		rowCount: total,
		enableMultiSort: false,
		enableSortingRemoval: false,
		autoResetPageIndex: false,
		state: { sorting, pagination },
		onSortingChange,
		onPaginationChange,
	});

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h1 className="font-semibold text-xl">Utilisateurs</h1>
					<p className="text-muted-foreground text-sm">
						Comptes, rôles et groupes.
					</p>
				</div>
				<Button onClick={() => setDialog({ type: "create" })}>
					Nouvel utilisateur
				</Button>
			</div>

			<UsersToolbar
				key={query.q ?? ""}
				query={query}
				groups={groups}
				onChange={navigate}
				onReset={() =>
					navigate({
						q: undefined,
						role: undefined,
						status: undefined,
						groupId: undefined,
					})
				}
			/>

			{error && <FormError>{error}</FormError>}

			<div className={isPending ? "opacity-60 transition-opacity" : undefined}>
				<DataTable table={table} emptyMessage="Aucun utilisateur." />
			</div>

			<DataTablePagination table={table} />

			{dialog?.type === "create" && (
				<UserFormDialog
					allowedEmailDomains={allowedEmailDomains}
					groups={groups}
					isSelf={false}
					onClose={close}
					onDone={done}
				/>
			)}
			{dialog?.type === "edit" && (
				<UserFormDialog
					allowedEmailDomains={allowedEmailDomains}
					user={dialog.user}
					groups={groups}
					isSelf={dialog.user.id === currentUserId}
					onClose={close}
					onDone={done}
				/>
			)}
			{dialog?.type === "password" && (
				<PasswordDialog user={dialog.user} onClose={close} onDone={done} />
			)}
			{dialog?.type === "ban" && (
				<BanDialog user={dialog.user} onClose={close} onDone={done} />
			)}

			<AlertDialog
				open={dialog?.type === "delete"}
				onOpenChange={(open) => !open && close()}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Supprimer{" "}
							{dialog?.type === "delete" ? dialog.user.name : "l'utilisateur"} ?
						</AlertDialogTitle>
						<AlertDialogDescription>
							Le compte, ses sessions et ses appartenances aux groupes seront
							supprimés définitivement.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() =>
								dialog?.type === "delete" && confirmDelete(dialog.user)
							}
						>
							Supprimer
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
