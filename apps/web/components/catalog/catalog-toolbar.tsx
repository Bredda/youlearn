"use client";

import { useForm, useStore } from "@tanstack/react-form";
import type { CatalogQuery, CatalogStatus, PublicGroup } from "@youlearn/types";
import { FilterSelect } from "@/components/data-table/filter-select";
import { Icon } from "@/components/icon";
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
import { CATALOG_DEFAULT_PAGE_SIZE } from "@/lib/catalog-query";
import { ENROLLMENT_STATUS_LABELS } from "@/lib/enrollments";

const SORTS = [
	{ value: "publishedAt:desc", label: "Les plus récents" },
	{ value: "publishedAt:asc", label: "Les plus anciens" },
	{ value: "name:asc", label: "Nom (A → Z)" },
	{ value: "name:desc", label: "Nom (Z → A)" },
];

const STATUSES: { value: CatalogStatus; label: string }[] = [
	{ value: "none", label: "Pas commencés" },
	{ value: "in_progress", label: ENROLLMENT_STATUS_LABELS.in_progress },
	{ value: "completed", label: ENROLLMENT_STATUS_LABELS.completed },
	{ value: "failed", label: ENROLLMENT_STATUS_LABELS.failed },
];

// Remounted by the parent (`key`) when the search term changes from the outside, so the form follows the URL.
export function CatalogToolbar({
	query,
	groups,
	categories,
	onChange,
	onReset,
}: {
	query: CatalogQuery;
	/** The user's own groups and the categories of the courses they see. */
	groups: PublicGroup[];
	categories: string[];
	onChange: (patch: Partial<CatalogQuery>) => void;
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
			query.category ||
			query.groupId ||
			query.status ||
			query.sort !== "publishedAt" ||
			query.order !== "desc" ||
			query.pageSize !== CATALOG_DEFAULT_PAGE_SIZE,
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
								id="catalog-search"
								name={field.name}
								type="search"
								aria-label="Rechercher un cours"
								placeholder="Rechercher par nom ou description"
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
				label="Toutes les catégories"
				className="w-48"
				value={query.category}
				options={categories.map((category) => ({
					value: category,
					label: category,
				}))}
				onChange={(category) => onChange({ category })}
			/>
			<FilterSelect
				label="Tous les statuts"
				className="w-48"
				value={query.status}
				options={STATUSES}
				onChange={(status) => onChange({ status: status as CatalogStatus })}
			/>
			{groups.length > 0 && (
				<FilterSelect
					label="Tous mes groupes"
					className="w-48"
					value={query.groupId}
					options={groups.map((group) => ({
						value: group.id,
						label: group.name,
					}))}
					onChange={(groupId) => onChange({ groupId })}
				/>
			)}
			<Select
				value={`${query.sort}:${query.order}`}
				onValueChange={(value) => {
					const [sort, order] = (value ?? "").split(":");
					onChange({
						sort: sort as CatalogQuery["sort"],
						order: order as CatalogQuery["order"],
					});
				}}
				items={SORTS}
			>
				<SelectTrigger className="w-48" aria-label="Trier par">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{SORTS.map((sort) => (
						<SelectItem key={sort.value} value={sort.value}>
							{sort.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

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
