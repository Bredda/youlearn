"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { EVENT_FEATURES, EVENTS, type EventType } from "@youlearn/events";
import type { AdminEventQuery } from "@youlearn/types";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { EVENT_LABELS, eventFullLabel, FEATURE_LABELS } from "@/lib/events";
import { DEFAULT_PAGE_SIZE } from "@/lib/users-query";

const ALL = "all";

// Flat list for the trigger (it shows the full label of the selected item), groups are only for the menu.
const items = [
	{ value: ALL, label: "Tous les événements" },
	...EVENT_FEATURES.flatMap((feature) => [
		{ value: feature, label: `${FEATURE_LABELS[feature]} · tous` },
		...EVENTS[feature].map((action) => {
			const type = `${feature}.${action}` as EventType;
			return { value: type, label: eventFullLabel(type) };
		}),
	]),
];

// Remounted by the parent (`key`) when the search term changes from the outside, so the form follows the URL.
export function EventsToolbar({
	query,
	onChange,
	onReset,
}: {
	query: AdminEventQuery;
	onChange: (patch: Partial<AdminEventQuery>) => void;
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
			query.type ||
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
								id="events-search"
								name={field.name}
								type="search"
								aria-label="Rechercher un événement"
								placeholder="Rechercher par auteur ou cible"
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

			<Select
				value={query.type ?? ALL}
				onValueChange={(next) =>
					onChange({
						type:
							next === ALL || !next
								? undefined
								: (next as AdminEventQuery["type"]),
					})
				}
				items={items}
			>
				<SelectTrigger className="w-72" aria-label="Type d'événement">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={ALL}>Tous les événements</SelectItem>
					{EVENT_FEATURES.map((feature) => (
						<SelectGroup key={feature}>
							<SelectLabel>{FEATURE_LABELS[feature]}</SelectLabel>
							<SelectItem value={feature}>Tous</SelectItem>
							{EVENTS[feature].map((action) => {
								const type = `${feature}.${action}` as EventType;
								return (
									<SelectItem key={type} value={type}>
										{EVENT_LABELS[type]}
									</SelectItem>
								);
							})}
						</SelectGroup>
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
