"use client";

import type {
	CourseLesson,
	WriterAsset,
	WriterCourse,
	WriterRevisionDetail,
} from "@youlearn/types";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FormError } from "@/components/form-error";
import { Icon, PendingIcon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/writer/markdown";
import {
	REVISION_STATUS_LABELS,
	REVISION_STATUS_VARIANTS,
} from "@/lib/revisions";

const errorOf = async (response: Response) =>
	((await response.json().catch(() => null)) as { error?: string } | null)
		?.error ?? "Une erreur est survenue";

/** Edits the lessons of a revision. Only a draft is editable: any other status shows the content read-only. */
export function RevisionEditor({
	course,
	revision,
}: {
	course: WriterCourse;
	revision: WriterRevisionDetail;
}) {
	const readOnly = revision.status !== "draft";
	const [lessons, setLessons] = useState<CourseLesson[]>(
		revision.content.lessons,
	);
	const [selectedId, setSelectedId] = useState(revision.content.lessons[0]?.id);
	// Sent back on save: the API refuses the save when somebody changed the revision since.
	const [updatedAt, setUpdatedAt] = useState(revision.updatedAt);
	const [dirty, setDirty] = useState(false);
	const [preview, setPreview] = useState(readOnly);
	const [saving, setSaving] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string>();
	const [stale, setStale] = useState(false);
	const bodyRef = useRef<HTMLTextAreaElement>(null);
	const fileRef = useRef<HTMLInputElement>(null);

	const selected = lessons.find((lesson) => lesson.id === selectedId);

	useEffect(() => {
		if (!dirty) return;
		const warn = (event: BeforeUnloadEvent) => event.preventDefault();
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [dirty]);

	function change(next: CourseLesson[]) {
		setLessons(next);
		setDirty(true);
	}

	const patchSelected = (patch: Partial<CourseLesson>) =>
		change(
			lessons.map((lesson) =>
				lesson.id === selectedId ? { ...lesson, ...patch } : lesson,
			),
		);

	function addLesson() {
		const lesson: CourseLesson = {
			id: crypto.randomUUID(),
			title: "Nouvelle leçon",
			type: "markdown",
			body: "",
		};
		change([...lessons, lesson]);
		setSelectedId(lesson.id);
		setPreview(false);
	}

	function move(index: number, by: -1 | 1) {
		const target = index + by;
		const moved = lessons[index];
		const other = lessons[target];
		if (!moved || !other) return;
		const next = [...lessons];
		next[index] = other;
		next[target] = moved;
		change(next);
	}

	function remove(id: string) {
		const next = lessons.filter((lesson) => lesson.id !== id);
		change(next);
		if (id === selectedId) setSelectedId(next[0]?.id);
	}

	async function save() {
		setSaving(true);
		setError(undefined);
		setStale(false);
		const response = await fetch(
			`/api/writer/courses/${course.id}/revisions/${revision.id}/content`,
			{
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					content: { version: 1, lessons },
					expectedUpdatedAt: updatedAt,
				}),
			},
		);
		setSaving(false);
		if (!response.ok) {
			const data = (await response.json().catch(() => null)) as {
				error?: string;
				code?: string;
			} | null;
			setStale(data?.code === "STALE");
			return setError(data?.error ?? "Une erreur est survenue");
		}
		const { revision: saved } = (await response.json()) as {
			revision: WriterRevisionDetail;
		};
		setUpdatedAt(saved.updatedAt);
		setDirty(false);
	}

	async function upload(file: File) {
		setUploading(true);
		setError(undefined);
		const form = new FormData();
		form.append("file", file);
		const response = await fetch(`/api/writer/courses/${course.id}/assets`, {
			method: "POST",
			body: form,
		});
		setUploading(false);
		if (!response.ok) return setError(await errorOf(response));
		const { asset } = (await response.json()) as { asset: WriterAsset };

		// Insert the image where the cursor is.
		const body = selected?.body ?? "";
		const textarea = bodyRef.current;
		const at = textarea?.selectionStart ?? body.length;
		const alt = file.name.replace(/\.[^.]+$/, "");
		const markdown = `![${alt}](asset:${asset.id})`;
		patchSelected({ body: body.slice(0, at) + markdown + body.slice(at) });
	}

	return (
		<div className="flex flex-col gap-4">
			<Link
				href={`/writer/courses/${course.id}`}
				className="text-muted-foreground text-sm hover:underline"
			>
				← {course.name}
			</Link>
			<PageHeader
				title={revision.key}
				description={
					readOnly
						? "Seul un brouillon est modifiable : pour corriger cette révision, clonez-la en brouillon depuis la page du cours."
						: undefined
				}
			>
				<Badge variant={REVISION_STATUS_VARIANTS[revision.status]}>
					{REVISION_STATUS_LABELS[revision.status]}
				</Badge>
				{!readOnly && (
					<Button onClick={save} disabled={!dirty || saving}>
						<PendingIcon pending={saving} name="save" />
						{dirty ? "Enregistrer" : "Enregistré"}
					</Button>
				)}
			</PageHeader>

			{error && (
				<FormError>
					{error}
					{stale && (
						<>
							{" "}
							<button
								type="button"
								className="underline"
								onClick={() => window.location.reload()}
							>
								Recharger
							</button>{" "}
							(vos modifications non enregistrées seront perdues).
						</>
					)}
				</FormError>
			)}

			<div className="grid gap-4 md:grid-cols-[16rem_1fr]">
				<div className="flex flex-col gap-2">
					<ul className="flex flex-col gap-1">
						{lessons.map((lesson, index) => (
							<li
								key={lesson.id}
								className={`flex items-center gap-1 rounded-md border px-2 py-1 ${
									lesson.id === selectedId ? "bg-muted" : ""
								}`}
							>
								<button
									type="button"
									className="min-w-0 flex-1 truncate text-left text-sm"
									onClick={() => setSelectedId(lesson.id)}
								>
									{index + 1}. {lesson.title}
								</button>
								{!readOnly && (
									<>
										<Button
											variant="ghost"
											size="icon-xs"
											aria-label="Monter"
											disabled={index === 0}
											onClick={() => move(index, -1)}
										>
											<Icon name="moveUp" />
										</Button>
										<Button
											variant="ghost"
											size="icon-xs"
											aria-label="Descendre"
											disabled={index === lessons.length - 1}
											onClick={() => move(index, 1)}
										>
											<Icon name="moveDown" />
										</Button>
										<Button
											variant="ghost"
											size="icon-xs"
											aria-label="Supprimer la leçon"
											onClick={() => remove(lesson.id)}
										>
											<Icon name="delete" />
										</Button>
									</>
								)}
							</li>
						))}
						{lessons.length === 0 && (
							<li className="text-muted-foreground text-sm">Aucune leçon.</li>
						)}
					</ul>
					{!readOnly && (
						<Button variant="outline" onClick={addLesson}>
							<Icon name="add" />
							Ajouter une leçon
						</Button>
					)}
				</div>

				{selected ? (
					<div className="flex min-w-0 flex-col gap-3">
						<Input
							value={selected.title}
							onChange={(e) => patchSelected({ title: e.target.value })}
							disabled={readOnly}
							aria-label="Titre de la leçon"
						/>
						<div className="flex items-center gap-2">
							{!readOnly && (
								<Button
									variant={preview ? "outline" : "secondary"}
									size="sm"
									onClick={() => setPreview(false)}
								>
									<Icon name="edit" />
									Éditer
								</Button>
							)}
							{!readOnly && (
								<Button
									variant={preview ? "secondary" : "outline"}
									size="sm"
									onClick={() => setPreview(true)}
								>
									<Icon name="view" />
									Aperçu
								</Button>
							)}
							{!readOnly && !preview && (
								<>
									<Button
										variant="outline"
										size="sm"
										disabled={uploading}
										onClick={() => fileRef.current?.click()}
									>
										<PendingIcon pending={uploading} name="image" />
										Insérer une image
									</Button>
									<input
										ref={fileRef}
										type="file"
										accept="image/png,image/jpeg,image/gif,image/webp"
										className="hidden"
										onChange={(e) => {
											const file = e.target.files?.[0];
											e.target.value = "";
											if (file) upload(file);
										}}
									/>
								</>
							)}
						</div>
						{preview ? (
							<div className="min-h-96 rounded-md border p-4">
								<Markdown courseId={course.id}>{selected.body}</Markdown>
							</div>
						) : (
							<Textarea
								ref={bodyRef}
								value={selected.body}
								onChange={(e) => patchSelected({ body: e.target.value })}
								className="min-h-96 font-mono"
								aria-label="Contenu de la leçon (markdown)"
							/>
						)}
					</div>
				) : (
					<p className="text-muted-foreground text-sm">
						Sélectionnez ou ajoutez une leçon.
					</p>
				)}
			</div>
		</div>
	);
}
