"use client";

import { formatDuration } from "@youlearn/content";
import type { WriterRevision } from "@youlearn/types";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { ReviewState } from "@/components/review/review-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RevisionAction } from "@/components/writer/revision-row-actions";

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
	dateStyle: "medium",
	timeStyle: "short",
});

/**
 * A revision of the "current" tab: the published one, or the one being written or reviewed. The main actions are
 * buttons in the card; the rest (and what destroys) is in the menu. The API enforces the workflow too.
 */
export function RevisionCard({
	courseId,
	revision,
	hasOpen,
	pending,
	onAction,
}: {
	courseId: string;
	revision: WriterRevision;
	/** Another revision is already being worked on or reviewed: none can be cloned from this one. */
	hasOpen: boolean;
	pending: boolean;
	onAction: (action: RevisionAction, revision: WriterRevision) => void;
}) {
	const { status } = revision;
	const base = `/writer/courses/${courseId}`;
	const run = (action: RevisionAction) => () => onAction(action, revision);
	const editable = status === "draft" || status === "preview";

	return (
		<Card>
			{/* Below sm the actions drop under the text instead of squeezing it. */}
			<CardHeader className="max-sm:has-data-[slot=card-action]:grid-cols-1">
				<CardTitle className="flex flex-wrap items-center gap-2 text-base">
					<Link
						href={`${base}/revisions/${revision.id}`}
						className="font-mono hover:underline"
					>
						{revision.key}
					</Link>
					{revision.certifying && (
						<Badge variant="outline">
							<Icon name="certifying" /> Certifiant
						</Badge>
					)}
				</CardTitle>
				<CardDescription className="line-clamp-3 whitespace-pre-wrap">
					{revision.purpose}
				</CardDescription>
				<CardAction className="flex flex-wrap items-center justify-end gap-2 max-sm:col-start-1 max-sm:row-span-1 max-sm:row-start-3 max-sm:mt-2 max-sm:justify-self-start">
					<Button
						variant={status === "draft" ? "default" : "outline"}
						nativeButton={false}
						render={<Link href={`${base}/revisions/${revision.id}`} />}
					>
						<Icon name={editable ? "edit" : "view"} />
						{editable ? "Éditer" : "Voir"}
					</Button>
					{status === "draft" && (
						<Button
							variant="outline"
							disabled={pending}
							onClick={run({ type: "status", to: "preview" })}
						>
							<Icon name="preview" />
							Passer en relecture
						</Button>
					)}
					{status === "preview" && (
						<Button
							disabled={pending}
							onClick={run({ type: "status", to: "published" })}
						>
							<Icon name="publish" />
							Publier
						</Button>
					)}
					{status === "published" && (
						<Button
							variant="outline"
							disabled={pending || hasOpen}
							title={
								hasOpen
									? "Une révision est déjà en cours : publiez-la ou supprimez-la d'abord"
									: undefined
							}
							onClick={run({ type: "clone" })}
						>
							<Icon name="clone" />
							Cloner en brouillon
						</Button>
					)}
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									variant="ghost"
									size="icon"
									aria-label={`Autres actions pour la révision ${revision.key}`}
								/>
							}
						>
							<Icon name="more" />
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="min-w-48">
							{status === "preview" && (
								<DropdownMenuItem onClick={run({ type: "reviewers" })}>
									<Icon name="learners" />
									Relecteurs
								</DropdownMenuItem>
							)}
							<DropdownMenuItem
								render={<Link href={`${base}/compare?to=${revision.id}`} />}
							>
								<Icon name="compare" />
								Comparer
							</DropdownMenuItem>
							{status === "preview" && (
								<DropdownMenuItem
									disabled={pending}
									onClick={run({ type: "status", to: "draft" })}
								>
									<Icon name="toDraft" />
									Repasser en brouillon
								</DropdownMenuItem>
							)}
							<DropdownMenuSeparator />
							{status === "published" && (
								<DropdownMenuItem
									variant="destructive"
									disabled={pending}
									onClick={run({ type: "status", to: "deprecated" })}
								>
									<Icon name="deprecate" />
									Déprécier
								</DropdownMenuItem>
							)}
							{editable && (
								<DropdownMenuItem
									variant="destructive"
									disabled={pending}
									onClick={run({ type: "delete" })}
								>
									<Icon name="delete" />
									Supprimer
								</DropdownMenuItem>
							)}
						</DropdownMenuContent>
					</DropdownMenu>
				</CardAction>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				<dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
					<div>
						<dt className="text-muted-foreground text-xs">Durée estimée</dt>
						<dd>{formatDuration(revision.durationMinutes) || "—"}</dd>
					</div>
					<div className="min-w-0">
						<dt className="text-muted-foreground text-xs">Contributeurs</dt>
						<dd className="truncate">
							{revision.contributors.map((c) => c.name).join(", ") || "—"}
						</dd>
					</div>
					<div>
						<dt className="text-muted-foreground text-xs">
							Dernière mise à jour
						</dt>
						<dd>{dateFormat.format(new Date(revision.updatedAt))}</dd>
					</div>
				</dl>
				<ReviewState revision={revision} />
			</CardContent>
		</Card>
	);
}
