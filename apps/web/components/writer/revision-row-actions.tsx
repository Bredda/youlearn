"use client";

import type { RevisionStatus, WriterRevision } from "@youlearn/types";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type RevisionAction =
	| { type: "status"; to: RevisionStatus }
	| { type: "clone" }
	| { type: "link" }
	| { type: "delete" };

/** The actions offered depend on the status of the revision (the API enforces the workflow too). */
export function RevisionRowActions({
	courseId,
	revision,
	hasOpen,
	pending,
	onAction,
}: {
	courseId: string;
	revision: WriterRevision;
	/** Another revision is already being worked on or reviewed: a new one cannot start. */
	hasOpen: boolean;
	pending: boolean;
	onAction: (action: RevisionAction, revision: WriterRevision) => void;
}) {
	const { status } = revision;
	const editable = status === "draft" || status === "preview";
	const run = (action: RevisionAction) => () => onAction(action, revision);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label={`Actions pour la révision ${revision.key}`}
					/>
				}
			>
				<Icon name="more" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					render={
						<Link
							href={`/writer/courses/${courseId}/revisions/${revision.id}`}
						/>
					}
				>
					<Icon name={editable ? "edit" : "view"} />
					{editable ? "Éditer" : "Voir"}
				</DropdownMenuItem>
				<DropdownMenuItem
					render={
						<Link
							href={`/writer/courses/${courseId}/compare?to=${revision.id}`}
						/>
					}
				>
					<Icon name="compare" />
					Comparer
				</DropdownMenuItem>

				{status === "draft" && (
					<DropdownMenuItem
						disabled={pending}
						onClick={run({ type: "status", to: "preview" })}
					>
						<Icon name="preview" />
						Passer en relecture
					</DropdownMenuItem>
				)}
				{status === "preview" && (
					<>
						<DropdownMenuItem onClick={run({ type: "link" })}>
							<Icon name="link" />
							Lien de relecture
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={pending}
							onClick={run({ type: "status", to: "published" })}
						>
							<Icon name="publish" />
							Publier
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={pending}
							onClick={run({ type: "status", to: "draft" })}
						>
							<Icon name="toDraft" />
							Repasser en brouillon
						</DropdownMenuItem>
					</>
				)}
				{(status === "published" || status === "deprecated") && (
					<DropdownMenuItem
						disabled={pending || hasOpen}
						onClick={run({ type: "clone" })}
					>
						<Icon name={status === "deprecated" ? "toDraft" : "clone"} />
						{status === "deprecated"
							? "Restaurer en brouillon"
							: "Cloner en brouillon"}
					</DropdownMenuItem>
				)}

				{status !== "deprecated" && <DropdownMenuSeparator />}
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
				{(status === "draft" || status === "preview") && (
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
	);
}
