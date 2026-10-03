"use client";

import type { RevisionStatus } from "@youlearn/types";
import { Icon } from "@/components/icon";
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

/**
 * Confirmation asked before a status change that retires a live revision: publishing over a published one
 * (`publishedKey`) or deprecating. Shared by the course page and the review page.
 */
export function RevisionStatusDialog({
	revisionKey,
	to,
	publishedKey,
	pending,
	onConfirm,
	onClose,
}: {
	revisionKey: string;
	to: Extract<RevisionStatus, "published" | "deprecated">;
	/** Key of the revision that is published now, named when publishing replaces it. */
	publishedKey?: string | null | undefined;
	pending: boolean;
	onConfirm: () => void;
	onClose: () => void;
}) {
	const publishing = to === "published";
	return (
		<AlertDialog open onOpenChange={(open) => !open && onClose()}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{publishing
							? `Publier la révision « ${revisionKey} » ?`
							: `Déprécier la révision « ${revisionKey} » ?`}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{publishing
							? `La révision « ${publishedKey} » est actuellement publiée : elle va être dépréciée. Les apprenants verront la nouvelle révision.`
							: "Le cours ne sera plus accessible aux apprenants tant qu'une autre révision n'est pas publiée. La révision dépréciée reste consultable dans l'historique."}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Annuler</AlertDialogCancel>
					<AlertDialogAction
						variant={publishing ? "default" : "destructive"}
						onClick={onConfirm}
						disabled={pending}
					>
						<Icon name="confirm" />
						Confirmer
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
