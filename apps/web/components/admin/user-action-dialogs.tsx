"use client";

import { useForm } from "@tanstack/react-form";
import { authClient } from "@youlearn/auth/client";
import type { AdminUser } from "@youlearn/types";
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
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authError } from "@/lib/api-client";
import type { IconName } from "@/lib/icons";

type Props = { user: AdminUser; onClose: () => void; onDone: () => void };

/** One-field dialog shared by "set password" and "ban". Mounted only while open. */
function ValueDialog({
	title,
	description,
	label,
	submitLabel,
	submitIcon,
	type = "text",
	schema,
	submit,
	onClose,
	onDone,
}: {
	title: string;
	description: string;
	label: string;
	submitLabel: string;
	submitIcon: IconName;
	type?: string;
	schema: z.ZodType<string, string>;
	submit: (value: string) => Promise<string | null>;
	onClose: () => void;
	onDone: () => void;
}) {
	const [error, setError] = useState<string>();
	const [pending, setPending] = useState(false);
	const form = useForm({
		defaultValues: { value: "" },
		validators: { onSubmit: z.object({ value: schema }) },
		onSubmit: async ({ value }) => {
			setPending(true);
			setError(undefined);
			const message = await submit(value.value);
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
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</DialogHeader>
					<FieldGroup>
						<form.Field
							name="value"
							// biome-ignore lint/correctness/noChildrenProp: shadcn pattern
							children={(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor="dialog-value">{label}</FieldLabel>
										<Input
											id="dialog-value"
											name={field.name}
											type={type}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
											autoComplete="off"
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
							<PendingIcon pending={pending} name={submitIcon} />
							{submitLabel}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function PasswordDialog({ user, onClose, onDone }: Props) {
	return (
		<ValueDialog
			title={`Nouveau mot de passe pour ${user.name}`}
			description="Définit un nouveau mot de passe pour ce compte."
			label="Mot de passe"
			submitLabel="Enregistrer"
			submitIcon="save"
			type="password"
			schema={z.string().min(8, "8 caractères minimum")}
			submit={async (newPassword) =>
				authError(
					await authClient.admin.setUserPassword({
						userId: user.id,
						newPassword,
					}),
				)
			}
			onClose={onClose}
			onDone={onDone}
		/>
	);
}

export function BanDialog({ user, onClose, onDone }: Props) {
	return (
		<ValueDialog
			title={`Bannir ${user.name}`}
			description="L'utilisateur est déconnecté immédiatement et ne peut plus se connecter tant qu'il n'est pas débanni."
			label="Motif (facultatif)"
			submitLabel="Bannir"
			submitIcon="ban"
			schema={z.string()}
			submit={async (reason) =>
				authError(
					await authClient.admin.banUser({
						userId: user.id,
						banReason: reason.trim() || undefined,
					}),
				)
			}
			onClose={onClose}
			onDone={onDone}
		/>
	);
}
