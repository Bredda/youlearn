"use client";

import { useForm } from "@tanstack/react-form";
import type { GroupWithMemberCount } from "@youlearn/types";
import { useState } from "react";
import z from "zod";
import { FormError } from "@/components/form-error";
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
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { callApi } from "@/lib/api-client";

const formSchema = z.object({
	name: z.string().trim().min(1, "Nom requis").max(64, "64 caractères maximum"),
});

// Mounted only while open, so the form starts fresh each time.
export function GroupFormDialog({
	group,
	onClose,
	onDone,
}: {
	/** The group being renamed, or undefined to create one. */
	group?: GroupWithMemberCount;
	onClose: () => void;
	onDone: () => void;
}) {
	const [error, setError] = useState<string>();
	const [pending, setPending] = useState(false);
	const form = useForm({
		defaultValues: { name: group?.name ?? "" },
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			setPending(true);
			setError(undefined);

			const message = group
				? await callApi("PATCH", `/api/admin/groups/${group.id}`, value)
				: await callApi("POST", "/api/admin/groups", value);

			setPending(false);
			if (message) return setError(message);
			onDone();
		},
	});

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
						<DialogTitle>
							{group ? "Renommer le groupe" : "Nouveau groupe"}
						</DialogTitle>
						<DialogDescription>
							Le nom doit être unique (sans tenir compte de la casse).
						</DialogDescription>
					</DialogHeader>
					<FieldGroup>
						<form.Field
							name="name"
							// biome-ignore lint/correctness/noChildrenProp: shadcn pattern
							children={(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor="group-name">Nom</FieldLabel>
										<Input
											id="group-name"
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
											autoFocus
										/>
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
							{pending && <Spinner />}
							{group ? "Enregistrer" : "Créer"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
