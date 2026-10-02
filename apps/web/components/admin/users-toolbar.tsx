"use client";

import { useForm } from "@tanstack/react-form";
import type { AdminUserQuery, GroupWithMemberCount } from "@youlearn/types";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const ALL = "all";

/** A select filter where "all" means no filter. */
function FilterSelect({
	label,
	value,
	options,
	onChange,
	className,
}: {
	label: string;
	value: string | undefined;
	options: { value: string; label: string }[];
	onChange: (value: string | undefined) => void;
	className?: string;
}) {
	const items = [{ value: ALL, label }, ...options];
	return (
		<Select
			value={value ?? ALL}
			onValueChange={(next) =>
				onChange(next === ALL ? undefined : (next ?? undefined))
			}
			items={items}
		>
			<SelectTrigger className={className} aria-label={label}>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				{items.map((item) => (
					<SelectItem key={item.value} value={item.value}>
						{item.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

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
	const hasFilters = Boolean(
		query.q || query.role || query.status || query.groupId,
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
					Rechercher
				</Button>
			</form>

			<FilterSelect
				label="Tous les rôles"
				className="w-40"
				value={query.role}
				options={[
					{ value: "admin", label: "Admin" },
					{ value: "user", label: "Utilisateur" },
				]}
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

			{hasFilters && (
				<Button variant="ghost" onClick={onReset}>
					Réinitialiser
				</Button>
			)}
		</div>
	);
}
