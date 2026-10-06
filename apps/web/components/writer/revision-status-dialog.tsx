"use client";

import type { ReviewSummary, RevisionStatus } from "@youlearn/types";
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
import { reviewWarnings } from "@/lib/review-summary";

/**
 * Confirmation asked before a status change that retires a live revision: publishing over a published one
 * (`publishedKey`) or deprecating. Shared by the course page and the review page.
 */
export function RevisionStatusDialog({
	revisionKey,
	to,
	publishedKey,
	review,
	pending,
	onConfirm,
	onClose,
}: {
	revisionKey: string;
	to: Extract<RevisionStatus, "published" | "deprecated">;
	/** Key of the revision that is published now, named when publishing replaces it. */
	publishedKey?: string | null | undefined;
	/** Where the review stands: what is still open is listed before publishing. */
	review?: ReviewSummary | null | undefined;
	pending: boolean;
	onConfirm: () => void;
	onClose: () => void;
}) {
	const publishing = to === "published";
	const warnings = publishing ? reviewWarnings(review ?? null) : [];
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
							? publishedKey
								? `La révision « ${publishedKey} » est actuellement publiée : elle va être dépréciée. Les apprenants verront la nouvelle révision.`
								: "Les apprenants verront cette révision."
							: "Le cours ne sera plus accessible aux apprenants tant qu'une autre révision n'est pas publiée. La révision dépréciée reste consultable dans l'historique."}
					</AlertDialogDescription>
					{warnings.length > 0 && (
						<div className="rounded-md border border-dashed bg-muted/50 px-3 py-2 text-sm">
							<p className="font-medium">La relecture n'est pas terminée :</p>
							<ul className="list-disc pl-5">
								{warnings.map((warning) => (
									<li key={warning}>{warning}</li>
								))}
							</ul>
						</div>
					)}
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
