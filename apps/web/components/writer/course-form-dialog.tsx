"use client";

import { useForm } from "@tanstack/react-form";
import type { CourseGroupTag, WriterCourse } from "@youlearn/types";
import { useRef, useState } from "react";
import z from "zod";
import { GroupsCombobox } from "@/components/admin/groups-combobox";
import { FormError } from "@/components/form-error";
import { Badge } from "@/components/ui/badge";
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { assetUrl } from "@/components/writer/markdown";
import { callApi } from "@/lib/api-client";

const formSchema = z.object({
	name: z
		.string()
		.trim()
		.min(1, "Nom requis")
		.max(120, "120 caractères maximum"),
	slug: z
		.string()
		.trim()
		.max(80, "80 caractères maximum")
		.regex(
			/^([a-z0-9]+(-[a-z0-9]+)*)?$/,
			"Minuscules, chiffres et tirets uniquement",
		),
	description: z.string().trim().max(5000, "5000 caractères maximum"),
	categories: z.string(),
	groups: z
		.array(z.object({ id: z.string(), name: z.string(), system: z.boolean() }))
		.min(1, "Au moins un groupe"),
});

const parseCategories = (value: string) =>
	value
		.split(",")
		.map((category) => category.trim())
		.filter(Boolean);

// Mounted only while open, so the form starts fresh each time.
export function CourseFormDialog({
	course,
	assignableGroups,
	onClose,
	onDone,
}: {
	/** The course being edited, or undefined to create one. */
	course?: WriterCourse;
	assignableGroups: CourseGroupTag[];
	onClose: () => void;
	onDone: () => void;
}) {
	const [error, setError] = useState<string>();
	const [pending, setPending] = useState(false);
	// Cover image: uploaded as soon as it is picked, attached to the course on submit. Only for an existing course
	// (the files belong to it); `null` = removed.
	const [imageAssetId, setImageAssetId] = useState(
		course?.imageAssetId ?? null,
	);
	const [uploading, setUploading] = useState(false);
	const fileRef = useRef<HTMLInputElement>(null);

	async function uploadImage(file: File) {
		if (!course) return;
		setUploading(true);
		setError(undefined);
		const data = new FormData();
		data.append("file", file);
		const response = await fetch(`/api/writer/courses/${course.id}/assets`, {
			method: "POST",
			body: data,
		});
		setUploading(false);
		if (!response.ok) {
			const body = (await response.json().catch(() => null)) as {
				error?: string;
			} | null;
			return setError(body?.error ?? "Échec de l'envoi de l'image");
		}
		const { asset } = (await response.json()) as { asset: { id: string } };
		setImageAssetId(asset.id);
	}

	// Groups of the course this user cannot manage (other teams, "Commun" for a writer): kept as they are.
	const assignableIds = new Set(assignableGroups.map((group) => group.id));
	const lockedGroups = (course?.groups ?? []).filter(
		(group) => !assignableIds.has(group.id),
	);

	const form = useForm({
		defaultValues: {
			name: course?.name ?? "",
			slug: course?.slug ?? "",
			description: course?.description ?? "",
			categories: course?.categories.join(", ") ?? "",
			groups: (course?.groups ?? []).filter((group) =>
				assignableIds.has(group.id),
			),
		},
		validators: { onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			setPending(true);
			setError(undefined);

			const body = {
				name: value.name,
				// Empty on creation = derived from the name by the API.
				...(value.slug && { slug: value.slug }),
				description: value.description,
				categories: parseCategories(value.categories),
				groupIds: value.groups.map((group) => group.id),
				...(course && { imageAssetId }),
			};
			const message = course
				? await callApi("PATCH", `/api/writer/courses/${course.id}`, body)
				: await callApi("POST", "/api/writer/courses", body);

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
							{course ? "Modifier le cours" : "Nouveau cours"}
						</DialogTitle>
						<DialogDescription>
							Le contenu du cours se gère dans ses révisions.
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
										<FieldLabel htmlFor="course-name">Nom</FieldLabel>
										<Input
											id="course-name"
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
						<form.Field
							name="slug"
							// biome-ignore lint/correctness/noChildrenProp: shadcn pattern
							children={(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor="course-slug">Slug</FieldLabel>
										<Input
											id="course-slug"
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
											placeholder="généré à partir du nom"
											disabled={course?.everPublished}
										/>
										<FieldDescription>
											{course?.everPublished
												? "Figé : le cours a déjà été publié."
												: "Identifiant dans l'URL du cours, unique."}
										</FieldDescription>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						/>
						<form.Field
							name="description"
							// biome-ignore lint/correctness/noChildrenProp: shadcn pattern
							children={(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel htmlFor="course-description">
											Description
										</FieldLabel>
										<Textarea
											id="course-description"
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
											rows={3}
										/>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						/>
						{course && (
							<Field>
								<FieldLabel>Image</FieldLabel>
								<div className="flex items-center gap-3">
									{imageAssetId ? (
										// biome-ignore lint/performance/noImgElement: asset URLs are API routes, not optimizable by next/image
										<img
											src={assetUrl(course.id, imageAssetId)}
											alt=""
											className="h-16 w-28 rounded-md border object-cover"
										/>
									) : (
										<span className="text-muted-foreground text-sm">
											Aucune image
										</span>
									)}
									<Button
										type="button"
										variant="outline"
										size="sm"
										disabled={uploading}
										onClick={() => fileRef.current?.click()}
									>
										{uploading && <Spinner />}
										{imageAssetId ? "Remplacer" : "Ajouter"}
									</Button>
									{imageAssetId && (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => setImageAssetId(null)}
										>
											Retirer
										</Button>
									)}
									<input
										ref={fileRef}
										type="file"
										accept="image/png,image/jpeg,image/gif,image/webp"
										className="hidden"
										onChange={(e) => {
											const file = e.target.files?.[0];
											e.target.value = "";
											if (file) uploadImage(file);
										}}
									/>
								</div>
								<FieldDescription>
									PNG, JPEG, GIF ou WebP, 5 Mo maximum.
								</FieldDescription>
							</Field>
						)}
						<form.Field
							name="categories"
							// biome-ignore lint/correctness/noChildrenProp: shadcn pattern
							children={(field) => (
								<Field>
									<FieldLabel htmlFor="course-categories">
										Catégories
									</FieldLabel>
									<Input
										id="course-categories"
										name={field.name}
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder="web, javascript"
									/>
									<FieldDescription>
										Mots-clés libres, séparés par des virgules.
									</FieldDescription>
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
										<FieldLabel htmlFor="course-groups">Groupes</FieldLabel>
										<GroupsCombobox
											id="course-groups"
											groups={assignableGroups}
											value={field.state.value}
											onChange={(groups) =>
												field.handleChange(groups as CourseGroupTag[])
											}
											onBlur={field.handleBlur}
											invalid={isInvalid}
										/>
										{lockedGroups.length > 0 && (
											<FieldDescription className="flex flex-wrap items-center gap-1">
												Aussi visible de :
												{lockedGroups.map((group) => (
													<Badge key={group.id} variant="secondary">
														{group.name}
													</Badge>
												))}
											</FieldDescription>
										)}
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
							{course ? "Enregistrer" : "Créer"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
