"use client";

import { useForm, useStore } from "@tanstack/react-form";
import type { CourseGroupTag, WriterCourseQuery } from "@youlearn/types";
import { FilterSelect } from "@/components/data-table/filter-select";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DEFAULT_PAGE_SIZE } from "@/lib/users-query";

// Remounted by the parent (`key`) when the search term changes from the outside, so the form follows the URL.
export function CoursesToolbar({
	query,
	groups,
	categories,
	onChange,
	onReset,
}: {
	query: WriterCourseQuery;
	/** Groups and categories used by the courses of the user. */
	groups: CourseGroupTag[];
	categories: string[];
	onChange: (patch: Partial<WriterCourseQuery>) => void;
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
			query.status ||
			query.groupId ||
			query.category ||
			query.sort !== "updatedAt" ||
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
								id="courses-search"
								name={field.name}
								type="search"
								aria-label="Rechercher un cours"
								placeholder="Rechercher par nom ou slug"
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
				label="Tous les statuts"
				className="w-48"
				value={query.status}
				options={[
					{ value: "published", label: "Avec une révision publiée" },
					{ value: "preview", label: "En relecture" },
					{ value: "draft", label: "Avec un brouillon" },
					{ value: "none", label: "Sans révision active" },
				]}
				onChange={(status) =>
					onChange({ status: status as WriterCourseQuery["status"] })
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

			<Button
				variant="ghost"
				disabled={!canReset}
				onClick={() => {
					form.reset();
					onReset();
				}}
			>
				Réinitialiser
			</Button>
		</div>
	);
}
