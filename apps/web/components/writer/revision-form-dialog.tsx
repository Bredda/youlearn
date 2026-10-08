"use client";

import { useForm } from "@tanstack/react-form";
import type { WriterRevision } from "@youlearn/types";
import { useState } from "react";
import z from "zod";
import { FormError } from "@/components/form-error";
import { PendingIcon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { callApi } from "@/lib/api-client";
import { REVISION_STATUS_LABELS } from "@/lib/revisions";

const NONE = "none";

const formSchema = z.object({
	key: z
		.string()
		.trim()
		.min(1, "Identifiant requis")
		.max(64, "64 caractères maximum")
		.regex(
			/^[a-z0-9]+([-_][a-z0-9]+)*$/,
			"Minuscules, chiffres, tirets et underscores",
		),
	parentId: z.string(),
	purpose: z
		.string()
		.trim()
		.min(1, "Indiquez le but de cette révision")
		.max(2000, "2000 caractères maximum"),
});

// Mounted only while open, so the form starts fresh each time.
export function RevisionFormDialog({
	courseId,
	revisions,
	suggestedKey,
	baseId,
	onClose,
	onDone,
}: {
	courseId: string;
	revisions: WriterRevision[];
	suggestedKey: string;
	/** Revision to start from; defaults to the published one. */
	baseId?: string;
	onClose: () => void;
	onDone: () => void;
}) {
	const [error, setError] = useState<string>();
	const [pending, setPending] = useState(false);
	const base =
		baseId ?? revisions.find((revision) => revision.status === "published")?.id;

	const form = useForm({
		defaultValues: { key: suggestedKey, parentId: base ?? NONE, purpose: "" },
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			setPending(true);
			setError(undefined);
			const message = await callApi(
				"POST",
				`/api/writer/courses/${courseId}/revisions`,
				{
					key: value.key,
					purpose: value.purpose,
					...(value.parentId !== NONE && { parentId: value.parentId }),
				},
			);
			setPending(false);
			if (message) return setError(message);
			onDone();
		},
	});

	const items = [
		{ value: NONE, label: "Aucune (révision vide)" },
		...revisions.map((revision) => ({
			value: revision.id,
			label: `${revision.key} (${REVISION_STATUS_LABELS[revision.status].toLowerCase()})`,
		})),
	];

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent>
				<form
					className="flex flex-col gap-4"
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
				>
					<DialogHeader>
						<DialogTitle>Nouvelle révision</DialogTitle>
						<DialogDescription>
							La révision démarre en brouillon. Un cours n'a qu'une révision en
							cours (brouillon ou relecture) à la fois.
						</DialogDescription>
					</DialogHeader>
					<FieldGroup>
						<form.Field
							name="key"
							// biome-ignore lint/correctness/noChildrenProp: shadcn pattern
							children={(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor="revision-key">Identifiant</FieldLabel>
										<Input
											id="revision-key"
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
											autoFocus
										/>
										<FieldDescription>
											Unique pour ce cours, non modifiable ensuite.
										</FieldDescription>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						/>
						<form.Field
							name="parentId"
							// biome-ignore lint/correctness/noChildrenProp: shadcn pattern
							children={(field) => (
								<Field>
									<FieldLabel htmlFor="revision-parent">Basée sur</FieldLabel>
									<Select
										value={field.state.value}
										onValueChange={(next) => next && field.handleChange(next)}
										items={items}
									>
										<SelectTrigger id="revision-parent" className="w-full">
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
								</Field>
							)}
						/>
						<form.Field
							name="purpose"
							// biome-ignore lint/correctness/noChildrenProp: shadcn pattern
							children={(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor="revision-purpose">But</FieldLabel>
										<Textarea
											id="revision-purpose"
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
											rows={3}
											placeholder="Ex. : mise à jour du chapitre 2 pour la nouvelle version, correction des quiz…"
										/>
										<FieldDescription>
											Ce que cette révision change ou apporte. Visible dans
											l'historique et par les relecteurs.
										</FieldDescription>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						/>
						{error && <FormError>{error}</FormError>}
					</FieldGroup>
					<DialogFooter>
						<Button type="submit" disabled={pending}>
							<PendingIcon pending={pending} name="add" />
							Créer
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
