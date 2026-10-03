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
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { FormError } from "@/components/form-error";
import { Icon } from "@/components/icon";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { CourseFormDialog } from "@/components/writer/course-form-dialog";
import { assetUrl } from "@/components/writer/markdown";
import { ReviewLinkDialog } from "@/components/writer/review-link-dialog";
import { RevisionFormDialog } from "@/components/writer/revision-form-dialog";
import {
	type RevisionAction,
	RevisionRowActions,
} from "@/components/writer/revision-row-actions";
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
type Confirmation = {
	revision: WriterRevision;
	to: RevisionStatus;
};

export function CourseDetail({
	course,
	revisions,
	assignableGroups,
	suggestedKey,
	webUrl,
}: {
	course: WriterCourse;
	revisions: WriterRevision[];
	assignableGroups: CourseGroupTag[];
	suggestedKey: string;
	/** Public origin of the app (`WEB_URL`), the base of the review links. */
	webUrl: string;
}) {
	const router = useRouter();
	const [editing, setEditing] = useState(false);
	// `undefined` = closed, otherwise the revision to start from (`null` = default).
	const [creating, setCreating] = useState<{ baseId?: string }>();
	const [linking, setLinking] = useState<WriterRevision>();
	const [confirming, setConfirming] = useState<Confirmation>();
	const [deleting, setDeleting] = useState<WriterRevision>();
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
			return setConfirming({ revision, to });
		return setStatus(revision, to);
	}

	function onRevisionAction(action: RevisionAction, revision: WriterRevision) {
		switch (action.type) {
			case "status":
				return changeStatus(revision, action.to);
			case "clone":
				return setCreating({ baseId: revision.id });
			case "link":
				return setLinking(revision);
			case "delete":
				return setDeleting(revision);
		}
	}

	function confirmed() {
		if (!confirming) return;
		return setStatus(confirming.revision, confirming.to, true);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-col gap-4">
				<Link
					href="/writer/courses"
					className="text-muted-foreground text-sm hover:underline"
				>
					← Cours
				</Link>
				<PageHeader
					title={course.name}
					description={course.description || undefined}
				>
					<Button variant="outline" onClick={() => setEditing(true)}>
						<Icon name="edit" />
						Modifier
					</Button>
				</PageHeader>
				<div className="flex items-start gap-4">
					{course.imageAssetId && (
						// biome-ignore lint/performance/noImgElement: asset URLs are API routes, not optimizable by next/image
						<img
							src={assetUrl(course.id, course.imageAssetId)}
							alt=""
							className="h-24 w-40 rounded-md border object-cover"
						/>
					)}
					<div className="flex flex-col gap-2">
						<p className="text-muted-foreground text-xs">{course.slug}</p>
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
				</div>
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
						<Icon name="add" />
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
							<TableHead className="w-16 text-right">
								<span className="sr-only">Actions</span>
							</TableHead>
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
								<TableCell className="text-right">
									<RevisionRowActions
										courseId={course.id}
										revision={revision}
										hasDraft={draft !== undefined}
										pending={pending}
										onAction={onRevisionAction}
									/>
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

			{deleting && (
				<ConfirmDeleteDialog
					title={`Supprimer la révision « ${deleting.key} » ?`}
					description="Son contenu sera perdu. Cette action est définitive."
					expected={deleting.key}
					onConfirm={() => callApi("DELETE", `${api}/${deleting.id}`)}
					onClose={() => setDeleting(undefined)}
					onDone={() => {
						setDeleting(undefined);
						router.refresh();
					}}
				/>
			)}

			{linking && (
				<ReviewLinkDialog
					courseId={course.id}
					webUrl={webUrl}
					// Read from the refreshed list so a regenerated link is not shown stale.
					revision={revisions.find((r) => r.id === linking.id) ?? linking}
					onClose={() => setLinking(undefined)}
					onChanged={() => router.refresh()}
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
								confirming?.to === "published" ? "default" : "destructive"
							}
							onClick={confirmed}
							disabled={pending}
						>
							<Icon name="confirm" />
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
	return confirming.to === "published"
		? `Publier la révision « ${key} » ?`
		: `Déprécier la révision « ${key} » ?`;
}

function confirmationText(confirming?: Confirmation, publishedKey?: string) {
	if (!confirming) return "";
	if (confirming.to === "published")
		return `La révision « ${publishedKey} » est actuellement publiée : elle va être dépréciée. Les apprenants verront la nouvelle révision.`;
	return "Le cours ne sera plus accessible aux apprenants tant qu'une autre révision n'est pas publiée. La révision dépréciée reste consultable dans l'historique.";
}
