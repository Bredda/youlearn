"use client";

import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { RevisionStatus, WriterRevision } from "@youlearn/types";
import Link from "next/link";
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
	hasDraft,
	pending,
	onAction,
}: {
	courseId: string;
	revision: WriterRevision;
	/** A course has one draft at a time: it blocks everything that would create another. */
	hasDraft: boolean;
	pending: boolean;
	onAction: (action: RevisionAction, revision: WriterRevision) => void;
}) {
	const { status } = revision;
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
				<HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					render={
						<Link
							href={`/writer/courses/${courseId}/revisions/${revision.id}`}
						/>
					}
				>
					{status === "draft" ? "Éditer" : "Voir"}
				</DropdownMenuItem>

				{status === "draft" && (
					<DropdownMenuItem
						disabled={pending}
						onClick={run({ type: "status", to: "preview" })}
					>
						Passer en relecture
					</DropdownMenuItem>
				)}
				{status === "preview" && (
					<>
						<DropdownMenuItem onClick={run({ type: "link" })}>
							Lien de relecture
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={pending}
							onClick={run({ type: "status", to: "published" })}
						>
							Publier
						</DropdownMenuItem>
						<DropdownMenuItem
							disabled={pending || hasDraft}
							onClick={run({ type: "status", to: "draft" })}
						>
							Repasser en brouillon
						</DropdownMenuItem>
					</>
				)}
				{(status === "published" || status === "deprecated") && (
					<DropdownMenuItem
						disabled={pending || hasDraft}
						onClick={run({ type: "clone" })}
					>
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
						Déprécier
					</DropdownMenuItem>
				)}
				{(status === "draft" || status === "preview") && (
					<DropdownMenuItem
						variant="destructive"
						disabled={pending}
						onClick={run({ type: "delete" })}
					>
						Supprimer
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
