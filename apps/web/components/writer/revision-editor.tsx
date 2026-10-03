"use client";

import {
	type CourseContent,
	chaptersMissingDuration,
	contentSchema,
	courseDurationMinutes,
	deepEqual,
	diffContent,
	formatDuration,
} from "@youlearn/content";
import type { WriterCourse, WriterRevisionDetail } from "@youlearn/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useReducer,
	useState,
} from "react";
import { ChapterView } from "@/components/content/chapter-view";
import { DiffSummary, RevisionDiff } from "@/components/content/revision-diff";
import { FormError } from "@/components/form-error";
import { Icon, PendingIcon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { ChapterEditor } from "@/components/writer/chapter-editor";
import { ConfirmRemove } from "@/components/writer/confirm-remove";
import { RevisionStatusDialog } from "@/components/writer/revision-status-dialog";
import { DragHandle, SortableList } from "@/components/writer/sortable-list";
import { callApi } from "@/lib/api-client";
import {
	type EditAction,
	editContent,
	newChapter,
	newFinalExam,
} from "@/lib/content-editor";
import { describeIssues, type EditorIssue } from "@/lib/content-issues";
import {
	REVISION_STATUS_LABELS,
	REVISION_STATUS_VARIANTS,
} from "@/lib/revisions";

const errorOf = async (response: Response) =>
	((await response.json().catch(() => null)) as { error?: string } | null)
		?.error ?? "Une erreur est survenue";

type LocalDraft = { content: CourseContent; savedAt: string };

/** The editor keeps a copy of unsaved work in this browser, so a conflict or a crash does not lose it. */
const draftKey = (revisionId: string) => `youlearn:draft:${revisionId}`;

function readLocalDraft(revisionId: string): LocalDraft | undefined {
	try {
		const raw = localStorage.getItem(draftKey(revisionId));
		if (!raw) return;
		const saved = JSON.parse(raw) as {
			content?: { version?: unknown; chapters?: unknown };
			savedAt?: unknown;
		};
		// Loose check on purpose: a draft in progress may well be invalid (empty title...).
		if (
			saved.content?.version !== 2 ||
			!Array.isArray(saved.content.chapters) ||
			typeof saved.savedAt !== "string"
		)
			return;
		return { content: saved.content as CourseContent, savedAt: saved.savedAt };
	} catch {
		return;
	}
}

function writeLocalDraft(revisionId: string, content: CourseContent | null) {
	try {
		if (content === null) localStorage.removeItem(draftKey(revisionId));
		else
			localStorage.setItem(
				draftKey(revisionId),
				JSON.stringify({ content, savedAt: new Date().toISOString() }),
			);
	} catch {
		// Storage unavailable (private window, quota): the editor works the same without the safety net.
	}
}

const DIFF_BADGES = {
	added: {
		label: "Ajouté",
		tint: "bg-green-500/15 text-green-700 dark:text-green-400",
	},
	modified: {
		label: "Modifié",
		tint: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
	},
	removed: {
		label: "Retiré",
		tint: "bg-red-500/15 text-red-700 dark:text-red-400",
	},
} as const;

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
	dateStyle: "short",
	timeStyle: "short",
});

/**
 * Edits the chapters of a revision. Only a draft is editable: any other status shows the content read-only.
 * `base` (the parent revision) feeds the live diff: badges in the outline, inline diff in text blocks and a
 * panel listing every change.
 */
export function RevisionEditor({
	course,
	revision,
	base,
}: {
	course: WriterCourse;
	revision: WriterRevisionDetail;
	base: WriterRevisionDetail | null;
}) {
	const router = useRouter();
	const readOnly = revision.status !== "draft";
	// A revision in review can be published from here; that deprecates the published one, which is confirmed first.
	const published = course.current.published;
	const [confirmingPublish, setConfirmingPublish] = useState(false);
	const [publishing, setPublishing] = useState(false);
	const [content, dispatchEdit] = useReducer(editContent, revision.content);
	const [selectedId, setSelectedId] = useState(
		revision.content.chapters[0]?.id,
	);
	// Sent back on save: the API refuses the save when somebody changed the revision since.
	const [updatedAt, setUpdatedAt] = useState(revision.updatedAt);
	const [dirty, setDirty] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string>();
	const [stale, setStale] = useState(false);
	const [issues, setIssues] = useState<EditorIssue[]>([]);
	const [showChanges, setShowChanges] = useState(false);
	const [restorable, setRestorable] = useState<LocalDraft>();

	const dispatch = useCallback((action: EditAction) => {
		dispatchEdit(action);
		setDirty(true);
	}, []);

	const selected = content.chapters.find((c) => c.id === selectedId);
	// The final exam is pinned after the chapters: it is listed apart and never dragged.
	const regularChapters = content.chapters.filter(
		(c) => c.kind !== "final-exam",
	);
	const finalExam = content.chapters.find((c) => c.kind === "final-exam");
	const totalMinutes = courseDurationMinutes(content);
	const missingDurations = chaptersMissingDuration(content).length;
	const [confirmingUncertify, setConfirmingUncertify] = useState(false);

	// Heavy work (validation, diff) follows the typing instead of blocking it.
	const deferred = useDeferredValue(content);
	const liveIssues = useMemo(() => {
		if (readOnly) return [];
		const result = contentSchema.safeParse(deferred);
		return result.success ? [] : describeIssues(deferred, result.error.issues);
	}, [deferred, readOnly]);
	const liveDiff = useMemo(
		() => (base ? diffContent(base.content, deferred) : null),
		[base, deferred],
	);
	const diffStatus = useMemo(
		() =>
			new Map(
				liveDiff?.chapters.map((c) => [
					c.id,
					{ status: c.status, moved: c.moved },
				]),
			),
		[liveDiff],
	);

	useEffect(() => {
		if (!dirty) return;
		const warn = (event: BeforeUnloadEvent) => event.preventDefault();
		window.addEventListener("beforeunload", warn);
		return () => window.removeEventListener("beforeunload", warn);
	}, [dirty]);

	// Unsaved work, kept in this browser.
	useEffect(() => {
		if (!dirty) return;
		const timer = setTimeout(() => writeLocalDraft(revision.id, content), 1000);
		return () => clearTimeout(timer);
	}, [content, dirty, revision.id]);

	useEffect(() => {
		if (readOnly) return;
		const saved = readLocalDraft(revision.id);
		if (saved && !deepEqual(saved.content, revision.content))
			setRestorable(saved);
	}, [readOnly, revision.id, revision.content]);

	function restore() {
		if (!restorable) return;
		dispatchEdit({ type: "reset", content: restorable.content });
		setSelectedId(restorable.content.chapters[0]?.id);
		setDirty(true);
		setRestorable(undefined);
	}

	function discardLocalDraft() {
		writeLocalDraft(revision.id, null);
		setRestorable(undefined);
	}

	function addChapter() {
		const chapter = newChapter();
		dispatch({ type: "addChapter", chapter });
		setSelectedId(chapter.id);
		setShowChanges(false);
	}

	function setCertifying(certifying: boolean) {
		if (certifying) {
			const exam = newFinalExam();
			dispatch({ type: "setCertifying", certifying: true, exam });
			setSelectedId(exam.id);
		} else {
			dispatch({ type: "setCertifying", certifying: false });
			if (selected?.kind === "final-exam") {
				setSelectedId(regularChapters[0]?.id);
			}
		}
		setConfirmingUncertify(false);
		setShowChanges(false);
	}

	function removeChapter(chapterId: string) {
		dispatch({ type: "removeChapter", chapterId });
		if (selectedId === chapterId) {
			setSelectedId(content.chapters.find((c) => c.id !== chapterId)?.id);
		}
	}

	async function publishRevision(confirm: boolean) {
		setPublishing(true);
		setError(undefined);
		setStale(false);
		const message = await callApi(
			"POST",
			`/api/writer/courses/${course.id}/revisions/${revision.id}/status`,
			{ to: "published", confirm },
		);
		setPublishing(false);
		setConfirmingPublish(false);
		if (message) return setError(message);
		toast.add({
			type: "success",
			title: `Révision « ${revision.key} » publiée`,
		});
		router.refresh();
	}

	async function save() {
		const parsed = contentSchema.safeParse(content);
		if (!parsed.success) {
			setIssues(describeIssues(content, parsed.error.issues));
			setError("Corrigez les points signalés avant d'enregistrer.");
			return;
		}
		setIssues([]);
		setSaving(true);
		setError(undefined);
		setStale(false);
		const response = await fetch(
			`/api/writer/courses/${course.id}/revisions/${revision.id}/content`,
			{
				method: "PUT",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					content: parsed.data,
					expectedUpdatedAt: updatedAt,
				}),
			},
		);
		setSaving(false);
		if (!response.ok) {
			const data = (await response
				.clone()
				.json()
				.catch(() => null)) as {
				error?: string;
				code?: string;
			} | null;
			setStale(data?.code === "STALE");
			setError(data?.error ?? (await errorOf(response)));
			// The local copy is the way back when somebody else saved first.
			writeLocalDraft(revision.id, content);
			return;
		}
		const { revision: saved } = (await response.json()) as {
			revision: WriterRevisionDetail;
		};
		setUpdatedAt(saved.updatedAt);
		setDirty(false);
		writeLocalDraft(revision.id, null);
		toast.add({ type: "success", title: "Modifications enregistrées" });
	}

	const shownIssues = issues.length > 0 ? issues : liveIssues;
	const baseTitle = base
		? `${base.key} (${REVISION_STATUS_LABELS[base.status].toLowerCase()})`
		: undefined;

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
					<>
						<span className="whitespace-pre-wrap">
							But : {revision.purpose}
						</span>
						{readOnly && (
							<span className="mt-1 block">
								Seul un brouillon est modifiable : pour corriger cette révision,
								clonez-la en brouillon depuis la page du cours.
							</span>
						)}
					</>
				}
			>
				<Badge variant={REVISION_STATUS_VARIANTS[revision.status]}>
					{REVISION_STATUS_LABELS[revision.status]}
				</Badge>
				{content.certifying && (
					<Badge variant="outline">
						<Icon name="certifying" /> Certifiant
					</Badge>
				)}
				<Badge variant="outline">
					<Icon name="duration" />
					{formatDuration(totalMinutes) || "Durée non estimée"}
				</Badge>
				<Button
					variant="outline"
					nativeButton={false}
					render={
						<Link
							href={`/writer/courses/${course.id}/compare?to=${revision.id}`}
						/>
					}
				>
					<Icon name="compare" />
					Comparer
				</Button>
				{revision.status === "preview" && (
					<Button
						disabled={publishing}
						onClick={() =>
							published ? setConfirmingPublish(true) : publishRevision(false)
						}
					>
						<PendingIcon pending={publishing} name="publish" />
						Publier
					</Button>
				)}
			</PageHeader>

			{confirmingPublish && (
				<RevisionStatusDialog
					revisionKey={revision.key}
					to="published"
					publishedKey={published?.key}
					pending={publishing}
					onConfirm={() => publishRevision(true)}
					onClose={() => setConfirmingPublish(false)}
				/>
			)}

			{confirmingUncertify && (
				<AlertDialog
					open
					onOpenChange={(open) => !open && setConfirmingUncertify(false)}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Retirer la certification ?</AlertDialogTitle>
							<AlertDialogDescription>
								L'examen final et ses questions seront perdus à l'enregistrement
								du brouillon.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Annuler</AlertDialogCancel>
							<AlertDialogAction
								variant="destructive"
								onClick={() => setCertifying(false)}
							>
								<Icon name="delete" />
								Retirer
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}

			{error && (
				<FormError>
					<span>{error}</span>
					{stale && (
						<Button
							variant="outline"
							size="sm"
							className="ml-2"
							onClick={() => window.location.reload()}
						>
							<Icon name="refresh" />
							Recharger
						</Button>
					)}
					{stale && (
						<span className="mt-1 block text-xs">
							Une copie de votre travail est gardée dans ce navigateur : après
							le rechargement, vous pourrez la restaurer.
						</span>
					)}
				</FormError>
			)}

			{restorable && (
				<div
					role="status"
					className="flex flex-wrap items-center gap-2 rounded-md border border-dashed bg-muted/50 px-3 py-2 text-sm"
				>
					<span>
						Un travail non enregistré de ce navigateur existe (
						{dateFormat.format(new Date(restorable.savedAt))}). Le restaurer
						remplace le contenu affiché.
					</span>
					<Button size="sm" variant="outline" onClick={restore}>
						<Icon name="reset" />
						Restaurer
					</Button>
					<Button size="sm" variant="ghost" onClick={discardLocalDraft}>
						<Icon name="cancel" />
						Ignorer
					</Button>
				</div>
			)}

			{shownIssues.length > 0 && (
				<div
					role="status"
					className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm"
				>
					<p className="font-medium">
						{shownIssues.length} point{shownIssues.length > 1 ? "s" : ""} à
						corriger avant d'enregistrer
					</p>
					<ul className="mt-1 list-disc pl-5">
						{shownIssues.slice(0, 5).map((issue) => (
							<li key={`${issue.location}|${issue.message}`}>
								{issue.location} : {issue.message}
							</li>
						))}
					</ul>
					{shownIssues.length > 5 && (
						<p className="mt-1 text-muted-foreground">
							… et {shownIssues.length - 5} autre
							{shownIssues.length - 5 > 1 ? "s" : ""}.
						</p>
					)}
				</div>
			)}

			{!readOnly && (
				<div className="flex flex-col gap-2 rounded-md border px-3 py-2">
					<div className="flex flex-wrap items-center gap-3">
						<Switch
							id="certifying"
							checked={content.certifying === true}
							onCheckedChange={(checked) =>
								checked ? setCertifying(true) : setConfirmingUncertify(true)
							}
						/>
						<Label htmlFor="certifying">Cours certifiant</Label>
						<span className="text-muted-foreground text-sm">
							Ajoute un examen final obligatoire, toujours en dernier chapitre.
						</span>
					</div>
					{missingDurations > 0 && (
						<p className="text-amber-700 text-sm dark:text-amber-400">
							{missingDurations} chapitre{missingDurations > 1 ? "s" : ""} sans
							durée estimée : à renseigner avant de passer en relecture.
						</p>
					)}
				</div>
			)}

			{base && liveDiff && (
				<div className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2">
					<Switch
						id="show-changes"
						checked={showChanges}
						onCheckedChange={setShowChanges}
					/>
					<Label htmlFor="show-changes">
						Voir les modifications depuis {baseTitle}
					</Label>
					<span className="ml-auto text-muted-foreground text-sm">
						<DiffSummary diff={liveDiff} />
					</span>
				</div>
			)}

			{showChanges && liveDiff ? (
				<RevisionDiff diff={liveDiff} courseId={course.id} />
			) : (
				<div className="grid gap-4 md:grid-cols-[16rem_1fr]">
					<div className="flex min-w-0 flex-col gap-2">
						{content.chapters.length === 0 && (
							<p className="text-muted-foreground text-sm">
								{readOnly
									? "Cette révision n'a pas de chapitre."
									: "Aucun chapitre : commencez par en ajouter un."}
							</p>
						)}
						<SortableList
							items={regularChapters}
							disabled={readOnly}
							className="flex flex-col gap-1"
							onMove={(from, to) => dispatch({ type: "moveChapter", from, to })}
						>
							{(chapter, index, handleRef) => {
								const change = diffStatus.get(chapter.id);
								const badge =
									change && change.status !== "unchanged"
										? DIFF_BADGES[change.status]
										: undefined;
								return (
									<div
										className={`flex items-center gap-1 rounded-md border px-1 py-1 ${
											chapter.id === selectedId ? "bg-muted" : ""
										}`}
									>
										{!readOnly && (
											<DragHandle
												handleRef={handleRef}
												label={`Déplacer le chapitre ${index + 1}`}
											/>
										)}
										<button
											type="button"
											aria-current={chapter.id === selectedId}
											onClick={() => setSelectedId(chapter.id)}
											className="min-w-0 flex-1 truncate px-1 text-left text-sm"
										>
											{index + 1}. {chapter.title || "(sans titre)"}
										</button>
										{chapter.estimatedMinutes !== undefined && (
											<span className="shrink-0 text-muted-foreground text-xs">
												{formatDuration(chapter.estimatedMinutes)}
											</span>
										)}
										{badge && (
											<Badge
												variant="outline"
												className={`border-transparent px-1 text-[10px] ${badge.tint}`}
											>
												{badge.label}
											</Badge>
										)}
										{change?.moved && (
											<Badge
												variant="outline"
												className="border-transparent bg-sky-500/15 px-1 text-[10px] text-sky-700 dark:text-sky-400"
											>
												Déplacé
											</Badge>
										)}
										{!readOnly && (
											<ConfirmRemove
												label={`Supprimer le chapitre ${index + 1}`}
												title="Supprimer ce chapitre ?"
												description={`« ${chapter.title} » et tout son contenu (blocs, quiz) seront perdus à l'enregistrement du brouillon.`}
												onConfirm={() => removeChapter(chapter.id)}
											/>
										)}
									</div>
								);
							}}
						</SortableList>
						{!readOnly && (
							<Button variant="outline" size="sm" onClick={addChapter}>
								<Icon name="add" />
								Ajouter un chapitre
							</Button>
						)}
						{finalExam && (
							<div
								className={`flex items-center gap-1 rounded-md border border-dashed px-2 py-1 ${
									finalExam.id === selectedId ? "bg-muted" : ""
								}`}
							>
								<Icon name="certifying" className="size-4 shrink-0" />
								<button
									type="button"
									aria-current={finalExam.id === selectedId}
									onClick={() => setSelectedId(finalExam.id)}
									className="min-w-0 flex-1 truncate px-1 text-left text-sm"
								>
									{finalExam.title || "(sans titre)"}
								</button>
								{finalExam.estimatedMinutes !== undefined && (
									<span className="shrink-0 text-muted-foreground text-xs">
										{formatDuration(finalExam.estimatedMinutes)}
									</span>
								)}
								{(() => {
									const change = diffStatus.get(finalExam.id);
									const badge =
										change && change.status !== "unchanged"
											? DIFF_BADGES[change.status]
											: undefined;
									return (
										badge && (
											<Badge
												variant="outline"
												className={`border-transparent px-1 text-[10px] ${badge.tint}`}
											>
												{badge.label}
											</Badge>
										)
									);
								})()}
							</div>
						)}
					</div>

					{selected &&
						(readOnly ? (
							<ChapterView chapter={selected} courseId={course.id} />
						) : (
							<ChapterEditor
								key={selected.id}
								chapter={selected}
								courseId={course.id}
								baseChapter={base?.content.chapters.find(
									(c) => c.id === selected.id,
								)}
								baseKey={base?.key}
								dispatch={dispatch}
							/>
						))}
				</div>
			)}
			{!readOnly && (
				<div className="sticky bottom-0 z-20 -mx-4 -mb-4 flex items-center gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
					<span
						aria-live="polite"
						className="mr-auto text-muted-foreground text-sm"
					>
						{dirty ? "Modifications non enregistrées" : "Tout est enregistré"}
					</span>
					<Button onClick={save} disabled={!dirty || saving}>
						<PendingIcon pending={saving} name="save" />
						Enregistrer
					</Button>
				</div>
			)}
		</div>
	);
}
