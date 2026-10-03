"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { ROLES } from "@youlearn/auth/roles";
import type { AdminUserQuery, GroupWithMemberCount } from "@youlearn/types";
import { FilterSelect } from "@/components/data-table/filter-select";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ROLE_LABELS } from "@/lib/roles";
import { DEFAULT_PAGE_SIZE } from "@/lib/users-query";

// Remounted by the parent (`key`) when the search term changes from the outside, so the form follows the URL.
export function UsersToolbar({
	query,
	groups,
	onChange,
	onReset,
}: {
	query: AdminUserQuery;
	groups: GroupWithMemberCount[];
	onChange: (patch: Partial<AdminUserQuery>) => void;
	onReset: () => void;
}) {
	const form = useForm({
		defaultValues: { q: query.q ?? "" },
		onSubmit: ({ value }) => onChange({ q: value.q.trim() || undefined }),
	});
	const typed = useStore(form.store, (state) => state.values.q);
	// Also covers a search term typed but not submitted yet, and the sorting / page size, not only the filters.
	const canReset = Boolean(
		typed ||
			query.q ||
			query.role ||
			query.status ||
			query.groupId ||
			query.sort !== "createdAt" ||
			query.order !== "desc" ||
			query.pageSize !== DEFAULT_PAGE_SIZE,
	);

	return (
		<div className="flex flex-wrap items-center gap-2">
			<form
				className="flex gap-2"
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
			>
				<form.Field
					name="q"
					// biome-ignore lint/correctness/noChildrenProp: shadcn pattern
					children={(field) => (
						<Field className="w-64">
							<Input
								id="users-search"
								name={field.name}
								type="search"
								aria-label="Rechercher un utilisateur"
								placeholder="Rechercher par nom ou email"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
							/>
						</Field>
					)}
				/>
				<Button type="submit" variant="outline">
					<Icon name="search" />
					Rechercher
				</Button>
			</form>

			<FilterSelect
				label="Tous les rôles"
				className="w-40"
				value={query.role}
				options={ROLES.map((role) => ({
					value: role,
					label: ROLE_LABELS[role],
				}))}
				onChange={(role) => onChange({ role: role as AdminUserQuery["role"] })}
			/>
			<FilterSelect
				label="Tous les statuts"
				className="w-40"
				value={query.status}
				options={[
					{ value: "active", label: "Actif" },
					{ value: "banned", label: "Banni" },
				]}
				onChange={(status) =>
					onChange({ status: status as AdminUserQuery["status"] })
				}
			/>
			<FilterSelect
				label="Tous les groupes"
				className="w-48"
				value={query.groupId}
				options={groups.map((group) => ({
					value: group.id,
					label: group.name,
				}))}
				onChange={(groupId) => onChange({ groupId })}
			/>

			<Button
				variant="ghost"
				disabled={!canReset}
				onClick={() => {
					form.reset();
					onReset();
				}}
			>
				<Icon name="reset" />
				Réinitialiser
			</Button>
		</div>
	);
}
