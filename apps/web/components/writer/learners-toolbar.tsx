"use client";

import { useForm, useStore } from "@tanstack/react-form";
import type { CourseEnrollmentQuery, EnrollmentStatus } from "@youlearn/types";
import { FilterSelect } from "@/components/data-table/filter-select";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	ENROLLMENT_STATUS_LABELS,
	LISTED_ENROLLMENT_STATUSES,
} from "@/lib/enrollments";
import { DEFAULT_PAGE_SIZE } from "@/lib/users-query";

// Remounted by the parent (`key`) when the search term changes from the outside, so the form follows the URL.
export function LearnersToolbar({
	query,
	onChange,
	onReset,
}: {
	query: CourseEnrollmentQuery;
	onChange: (patch: Partial<CourseEnrollmentQuery>) => void;
	onReset: () => void;
}) {
	const form = useForm({
		defaultValues: { q: query.q ?? "" },
		onSubmit: ({ value }) => onChange({ q: value.q.trim() || undefined }),
	});
	const typed = useStore(form.store, (state) => state.values.q);
	const canReset = Boolean(
		typed ||
			query.q ||
			query.status ||
			query.outdated ||
			query.sort !== "startedAt" ||
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
								id="learners-search"
								name={field.name}
								type="search"
								aria-label="Rechercher un apprenant"
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
				label="Tous les statuts"
				className="w-56"
				value={query.status}
				options={LISTED_ENROLLMENT_STATUSES.map((status) => ({
					value: status,
					label: ENROLLMENT_STATUS_LABELS[status],
				}))}
				onChange={(status) =>
					onChange({ status: status as EnrollmentStatus | undefined })
				}
			/>

			<FilterSelect
				label="Toutes les révisions"
				className="w-56"
				value={query.outdated ? "outdated" : undefined}
				options={[{ value: "outdated", label: "Pas à jour" }]}
				onChange={(value) =>
					onChange({ outdated: value === "outdated" ? true : undefined })
				}
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
