"use client";

import { useForm } from "@tanstack/react-form";
import { useState } from "react";
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

/**
 * Destructive confirmation in the GitHub way: the button stays disabled until the user types the exact name of
 * what they are about to destroy (email of a user, name of a group or a course...). Mounted only while open, so
 * the input starts empty each time.
 */
export function ConfirmDeleteDialog({
	title,
	description,
	expected,
	confirmLabel = "Supprimer",
	onConfirm,
	onClose,
	onDone,
}: {
	title: string;
	/** What will be lost: shown above the input. */
	description: React.ReactNode;
	/** The text to type, compared as is (case included). */
	expected: string;
	confirmLabel?: string;
	/** Performs the deletion. Returns an error message, or null on success. */
	onConfirm: () => Promise<string | null>;
	onClose: () => void;
	onDone: () => void;
}) {
	const [error, setError] = useState<string>();
	const [pending, setPending] = useState(false);
	const form = useForm({
		defaultValues: { confirmation: "" },
		onSubmit: async ({ value }) => {
			// The button is disabled otherwise, but Enter can still submit the form.
			if (value.confirmation.trim() !== expected) return;
			setPending(true);
			setError(undefined);
			const message = await onConfirm();
			setPending(false);
			if (message) return setError(message);
			onDone();
		},
	});

	return (
		<Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
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
					<form.Field
						name="confirmation"
						// biome-ignore lint/correctness/noChildrenProp: shadcn pattern
						children={(field) => (
							<Field>
								<FieldLabel htmlFor="confirm-delete-input">
									<span>
										Pour confirmer, saisissez{" "}
										<strong className="select-all font-mono">{expected}</strong>
									</span>
								</FieldLabel>
								<Input
									id="confirm-delete-input"
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									autoComplete="off"
									autoFocus
								/>
							</Field>
						)}
					/>
					{error && <FormError>{error}</FormError>}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							disabled={pending}
						>
							Annuler
						</Button>
						<form.Subscribe selector={(state) => state.values.confirmation}>
							{(confirmation) => (
								<Button
									type="submit"
									variant="destructive"
									disabled={pending || confirmation.trim() !== expected}
								>
									{pending && <Spinner />}
									{confirmLabel}
								</Button>
							)}
						</form.Subscribe>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
