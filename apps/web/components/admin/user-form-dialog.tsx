"use client";

import { useForm } from "@tanstack/react-form";
import { authClient } from "@youlearn/auth/client";
import { isEmailDomainAllowed } from "@youlearn/config/email-domain";
import type {
	AdminUser,
	GroupWithMemberCount,
	PublicGroup,
} from "@youlearn/types";
import { useState } from "react";
import z from "zod";
import { GroupsCombobox } from "@/components/admin/groups-combobox";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Spinner } from "@/components/ui/spinner";
import { authError, callApi } from "@/lib/api-client";

const baseSchema = z.object({
	name: z.string().trim().min(1, "Nom requis"),
	email: z.email("Adresse email invalide"),
	isAdmin: z.boolean(),
	groups: z.array(z.object({ id: z.string(), name: z.string() })),
});

// The email domain only matters at creation: on edit the email is read-only.
const createSchema = (allowedDomains: string[]) =>
	baseSchema.extend({
		email: z
			.email("Adresse email invalide")
			.refine(
				(email) => isEmailDomainAllowed(email, allowedDomains),
				`Domaine non autorisé (${allowedDomains.join(", ")})`,
			),
		password: z.string().min(8, "8 caractères minimum"),
	});
const editSchema = baseSchema.extend({ password: z.string() });

type Props = {
	/** The user being edited, or undefined to create one. */
	user?: AdminUser;
	groups: GroupWithMemberCount[];
	/** Prevents an admin from removing their own admin role. */
	isSelf: boolean;
	/** Empty = no restriction. */
	allowedEmailDomains: string[];
	onClose: () => void;
	onDone: () => void;
};

type Values = {
	name: string;
	email: string;
	password: string;
	isAdmin: boolean;
	groups: PublicGroup[];
};

// Mounted only while open, so the form starts fresh each time.
export function UserFormDialog({
	user,
	groups,
	isSelf,
	allowedEmailDomains,
	onClose,
	onDone,
}: Props) {
	const [error, setError] = useState<string>();
	const [pending, setPending] = useState(false);

	/** Returns an error message, or null once everything is saved. */
	async function save(value: Values): Promise<string | null> {
		const role = value.isAdmin ? "admin" : "user";
		let userId = user?.id;

		if (user) {
			if (value.name !== user.name) {
				const message = authError(
					await authClient.admin.updateUser({
						userId: user.id,
						data: { name: value.name },
					}),
				);
				if (message) return message;
			}
			if (role !== user.role) {
				const message = authError(
					await authClient.admin.setRole({ userId: user.id, role }),
				);
				if (message) return message;
			}
		} else {
			const created = await authClient.admin.createUser({
				email: value.email,
				password: value.password,
				name: value.name,
				role,
			});
			const message = authError(created);
			if (message) return message;
			userId = created.data?.user.id;
		}

		if (!userId) return "Une erreur est survenue";
		return callApi("PUT", `/api/admin/users/${userId}/groups`, {
			groupIds: value.groups.map((group) => group.id),
		});
	}

	const form = useForm({
		defaultValues: {
			name: user?.name ?? "",
			email: user?.email ?? "",
			password: "",
			isAdmin: user?.role === "admin",
			groups: user?.groups ?? [],
		} satisfies Values as Values,
		validators: {
			onSubmit: user ? editSchema : createSchema(allowedEmailDomains),
		},
		onSubmit: async ({ value }) => {
			setPending(true);
			setError(undefined);
			const message = await save(value);
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
							{user ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
						</DialogTitle>
						<DialogDescription>
							{user
								? "L'email et le mot de passe ne se modifient pas ici."
								: "Le compte est créé directement, l'utilisateur pourra se connecter avec ce mot de passe."}
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
										<FieldLabel htmlFor="user-name">Nom</FieldLabel>
										<Input
											id="user-name"
											name={field.name}
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

						<form.Field
							name="email"
							// biome-ignore lint/correctness/noChildrenProp: shadcn pattern
							children={(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor="user-email">Email</FieldLabel>
										<Input
											id="user-email"
											name={field.name}
											type="email"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
											disabled={Boolean(user)}
											autoComplete="off"
										/>
										{!user && allowedEmailDomains.length > 0 && (
											<FieldDescription>
												Domaines autorisés : {allowedEmailDomains.join(", ")}
											</FieldDescription>
										)}
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						/>

						{!user && (
							<form.Field
								name="password"
								// biome-ignore lint/correctness/noChildrenProp: shadcn pattern
								children={(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor="user-password">
												Mot de passe
											</FieldLabel>
											<Input
												id="user-password"
												name={field.name}
												type="password"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												aria-invalid={isInvalid}
												autoComplete="new-password"
											/>
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							/>
						)}

						<form.Field
							name="isAdmin"
							// biome-ignore lint/correctness/noChildrenProp: shadcn pattern
							children={(field) => (
								<Field orientation="horizontal">
									<Checkbox
										id="user-admin"
										name={field.name}
										checked={field.state.value}
										onCheckedChange={(checked) => field.handleChange(checked)}
										disabled={isSelf}
									/>
									<FieldLabel htmlFor="user-admin">Administrateur</FieldLabel>
								</Field>
							)}
						/>

						<form.Field
							name="groups"
							// biome-ignore lint/correctness/noChildrenProp: shadcn pattern
							children={(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor="user-groups">Groupes</FieldLabel>
										<GroupsCombobox
											id="user-groups"
											groups={groups}
											value={field.state.value}
											onChange={field.handleChange}
											onBlur={field.handleBlur}
											invalid={isInvalid}
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
							{user ? "Enregistrer" : "Créer"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
