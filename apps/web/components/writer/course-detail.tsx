"use client";

import type {
	CourseGroupTag,
	RevisionStatus,
	WriterCourse,
	WriterRevision,
} from "@youlearn/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/form-error";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { CourseFormDialog } from "@/components/writer/course-form-dialog";
import { RevisionFormDialog } from "@/components/writer/revision-form-dialog";
import { callApi } from "@/lib/api-client";
import {
	REVISION_STATUS_LABELS,
	REVISION_STATUS_VARIANTS,
} from "@/lib/revisions";

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
	dateStyle: "medium",
	timeStyle: "short",
});

/** What the user has to confirm before the API accepts the change. */
type Confirmation =
	| { kind: "status"; revision: WriterRevision; to: RevisionStatus }
	| { kind: "delete"; revision: WriterRevision };

export function CourseDetail({
	course,
	revisions,
	assignableGroups,
	suggestedKey,
}: {
	course: WriterCourse;
	revisions: WriterRevision[];
	assignableGroups: CourseGroupTag[];
	suggestedKey: string;
}) {
	const router = useRouter();
	const [editing, setEditing] = useState(false);
	// `undefined` = closed, otherwise the revision to start from (`null` = default).
	const [creating, setCreating] = useState<{ baseId?: string }>();
	const [confirming, setConfirming] = useState<Confirmation>();
	const [error, setError] = useState<string>();
	const [pending, setPending] = useState(false);

	const draft = course.current.draft;
	const published = course.current.published;
	const api = `/api/writer/courses/${course.id}/revisions`;

	async function run(request: Promise<string | null>) {
		setPending(true);
		setError(undefined);
		const message = await request;
		setPending(false);
		setConfirming(undefined);
		if (message) return setError(message);
		router.refresh();
	}

	const setStatus = (
		revision: WriterRevision,
		to: RevisionStatus,
		confirm = false,
	) =>
		run(
			callApi("POST", `${api}/${revision.id}/status`, {
				to,
				confirm,
			}),
		);

	/** Publishing over a published revision and deprecating both retire a live revision: ask first. */
	function changeStatus(revision: WriterRevision, to: RevisionStatus) {
		if ((to === "published" && published) || to === "deprecated")
			return setConfirming({ kind: "status", revision, to });
		return setStatus(revision, to);
	}

	function confirmed() {
		if (!confirming) return;
		if (confirming.kind === "delete")
			return run(callApi("DELETE", `${api}/${confirming.revision.id}`));
		return setStatus(confirming.revision, confirming.to, true);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-start justify-between gap-4">
				<div className="flex flex-col gap-2">
					<Link
						href="/writer/courses"
						className="text-muted-foreground text-sm hover:underline"
					>
						← Cours
					</Link>
					<h1 className="font-semibold text-xl">{course.name}</h1>
					<p className="text-muted-foreground text-xs">{course.slug}</p>
					{course.description && (
						<p className="max-w-prose text-sm">{course.description}</p>
					)}
					<div className="flex flex-wrap gap-1">
						{course.categories.map((category) => (
							<Badge key={category} variant="outline">
								{category}
							</Badge>
						))}
						{course.groups.map((group) => (
							<Badge key={group.id} variant="secondary">
								{group.name}
							</Badge>
						))}
					</div>
				</div>
				<Button variant="outline" onClick={() => setEditing(true)}>
					Modifier
				</Button>
			</div>

			<div className="flex flex-col gap-4">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="font-semibold">Révisions</h2>
						<p className="text-muted-foreground text-sm">
							Une révision publiée ne change plus : pour la corriger, on en crée
							une nouvelle à partir d'elle.
						</p>
					</div>
					<Button
						onClick={() => setCreating({})}
						disabled={draft !== undefined}
						title={
							draft
								? `Le brouillon « ${draft.key} » est déjà en cours`
								: undefined
						}
					>
						Nouvelle révision
					</Button>
				</div>

				{error && <FormError>{error}</FormError>}

				<Table className="table-fixed">
					<TableHeader>
						<TableRow>
							<TableHead>Révision</TableHead>
							<TableHead className="w-32">Statut</TableHead>
							<TableHead>Contributeurs</TableHead>
							<TableHead className="w-44">Mise à jour</TableHead>
							<TableHead className="w-80 text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{revisions.length === 0 && (
							<TableRow>
								<TableCell
									colSpan={5}
									className="text-center text-muted-foreground"
								>
									Aucune révision.
								</TableCell>
							</TableRow>
						)}
						{revisions.map((revision) => (
							<TableRow key={revision.id}>
								<TableCell className="truncate font-medium">
									{revision.key}
								</TableCell>
								<TableCell>
									<Badge variant={REVISION_STATUS_VARIANTS[revision.status]}>
										{REVISION_STATUS_LABELS[revision.status]}
									</Badge>
								</TableCell>
								<TableCell className="truncate text-muted-foreground">
									{revision.contributors.map((c) => c.name).join(", ")}
								</TableCell>
								<TableCell className="text-muted-foreground">
									{dateFormat.format(new Date(revision.updatedAt))}
								</TableCell>
								<TableCell className="space-x-2 whitespace-normal text-right">
									{revision.status === "draft" && (
										<Button
											variant="outline"
											size="sm"
											disabled={pending}
											onClick={() => changeStatus(revision, "preview")}
										>
											Passer en relecture
										</Button>
									)}
									{revision.status === "preview" && (
										<>
											<Button
												variant="outline"
												size="sm"
												disabled={pending || draft !== undefined}
												onClick={() => changeStatus(revision, "draft")}
											>
												Repasser en brouillon
											</Button>
											<Button
												size="sm"
												disabled={pending}
												onClick={() => changeStatus(revision, "published")}
											>
												Publier
											</Button>
										</>
									)}
									{revision.status === "published" && (
										<Button
											variant="outline"
											size="sm"
											disabled={pending}
											onClick={() => changeStatus(revision, "deprecated")}
										>
											Déprécier
										</Button>
									)}
									{(revision.status === "published" ||
										revision.status === "deprecated") && (
										<Button
											variant="outline"
											size="sm"
											disabled={pending || draft !== undefined}
											onClick={() => setCreating({ baseId: revision.id })}
										>
											{revision.status === "deprecated"
												? "Restaurer en brouillon"
												: "Cloner en brouillon"}
										</Button>
									)}
									{(revision.status === "draft" ||
										revision.status === "preview") && (
										<Button
											variant="destructive"
											size="sm"
											disabled={pending}
											onClick={() =>
												setConfirming({ kind: "delete", revision })
											}
										>
											Supprimer
										</Button>
									)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{editing && (
				<CourseFormDialog
					course={course}
					assignableGroups={assignableGroups}
					onClose={() => setEditing(false)}
					onDone={() => {
						setEditing(false);
						router.refresh();
					}}
				/>
			)}

			{creating && (
				<RevisionFormDialog
					courseId={course.id}
					revisions={revisions}
					suggestedKey={suggestedKey}
					baseId={creating.baseId}
					onClose={() => setCreating(undefined)}
					onDone={() => {
						setCreating(undefined);
						router.refresh();
					}}
				/>
			)}

			<AlertDialog
				open={confirming !== undefined}
				onOpenChange={(open) => !open && setConfirming(undefined)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{confirmationTitle(confirming)}</AlertDialogTitle>
						<AlertDialogDescription>
							{confirmationText(confirming, published?.key)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction
							variant={
								confirming?.kind === "status" && confirming.to === "published"
									? "default"
									: "destructive"
							}
							onClick={confirmed}
							disabled={pending}
						>
							Confirmer
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function confirmationTitle(confirming?: Confirmation) {
	if (!confirming) return "";
	const { key } = confirming.revision;
	if (confirming.kind === "delete") return `Supprimer la révision « ${key} » ?`;
	return confirming.to === "published"
		? `Publier la révision « ${key} » ?`
		: `Déprécier la révision « ${key} » ?`;
}

function confirmationText(confirming?: Confirmation, publishedKey?: string) {
	if (!confirming) return "";
	if (confirming.kind === "delete") return "Cette action est définitive.";
	if (confirming.to === "published")
		return `La révision « ${publishedKey} » est actuellement publiée : elle va être dépréciée. Les apprenants verront la nouvelle révision.`;
	return "Le cours ne sera plus accessible aux apprenants tant qu'une autre révision n'est pas publiée. La révision dépréciée reste consultable dans l'historique.";
}
