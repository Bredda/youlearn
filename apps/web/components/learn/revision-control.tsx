"use client";

import type {
	EnrollmentStatus,
	LearnerRevision,
	UpdateOffer,
} from "@youlearn/types";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { UpdateDialog } from "@/components/learn/update-available";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import type { IconName } from "@/lib/icons";

/** What the mark facing a revision the learner has followed says. */
const FOLLOWED: Record<EnrollmentStatus, { icon: IconName; label: string }> = {
	completed: { icon: "done", label: "Terminée" },
	in_progress: { icon: "inProgress", label: "En cours" },
	failed: { icon: "alert", label: "Échec à l'examen final" },
	superseded: { icon: "history", label: "Suivie, puis mise à jour" },
};

/**
 * The one place that says which revision of the course the learner is on, and what to do about a newer one: the
 * button shows the revision they follow (not necessarily the latest) with a badge when an update is on offer, and
 * its sheet lists the revisions, marks theirs and carries the way to the update.
 *
 * The dialog of the update opens by itself, once, when there is one the learner has not put off.
 */
export function RevisionControl({
	followedKey,
	publishedKey,
	revisions,
	enrollment,
}: {
	/** The revision the learner follows or followed; the published one when they have not started. */
	followedKey: string;
	publishedKey: string;
	revisions: LearnerRevision[];
	/** The enrollment in progress that has an update on offer, if any. */
	enrollment?: { id: string; update: UpdateOffer } | undefined;
}) {
	const update = enrollment?.update;
	const [sheetOpen, setSheetOpen] = useState(false);
	const [dialogOpen, setDialogOpen] = useState(
		update !== undefined && !update.postponed,
	);
	// The list is newest first: what comes before the followed revision is newer than it.
	const followedIndex = revisions.findIndex(
		(revision) => revision.key === followedKey,
	);

	return (
		<>
			<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
				<SheetTrigger
					render={<Button variant="outline" size="sm" />}
					aria-label={`Vous suivez la révision ${followedKey}${update ? ", une mise à jour est disponible" : ""} : voir les révisions`}
				>
					<Icon name="history" />
					Révision {followedKey}
					{update && (
						<span className="ml-1 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-primary-foreground text-xs">
							<Icon name="refresh" className="size-3" />
							Mise à jour disponible
						</span>
					)}
				</SheetTrigger>
				<SheetContent className="gap-0 sm:max-w-md">
					<SheetHeader>
						<SheetTitle>Révisions du cours</SheetTitle>
						<SheetDescription>
							Du plus récent au plus ancien. Vous suivez la révision «{" "}
							{followedKey} ». Quand une nouvelle révision est publiée, le cours
							vous propose de passer dessus : ce que vous avez déjà fait sur les
							chapitres inchangés est conservé.
						</SheetDescription>
					</SheetHeader>
					<div className="flex flex-col gap-3 overflow-y-auto p-4">
						{update && (
							<section className="flex flex-col gap-2 rounded-md border-2 border-primary bg-primary/10 p-3">
								<h3 className="flex items-center gap-2 font-semibold text-sm">
									<Icon name="refresh" className="size-4" />
									{update.level === "major"
										? "Mise à jour majeure disponible"
										: "Mise à jour mineure disponible"}
								</h3>
								<p className="text-sm">
									Vous suivez la révision {followedKey} ; la révision{" "}
									{publishedKey} est publiée
									{followedIndex > 1
										? `, ${followedIndex} révisions après la vôtre`
										: ""}
									.
								</p>
								<Button
									className="self-start"
									size="sm"
									onClick={() => {
										setSheetOpen(false);
										setDialogOpen(true);
									}}
								>
									<Icon name="refresh" /> Voir les changements
								</Button>
							</section>
						)}
						<ol className="flex flex-col gap-3">
							{revisions.map((revision, index) => {
								const followed = revision.enrollmentStatus
									? FOLLOWED[revision.enrollmentStatus]
									: null;
								const mine = revision.key === followedKey;
								const newer = followedIndex !== -1 && index < followedIndex;
								return (
									<li
										key={revision.key}
										className={`flex items-start gap-3 rounded-md border p-3 ${
											mine ? "border-primary" : ""
										}`}
									>
										<div className="flex min-w-0 flex-1 flex-col gap-1">
											<div className="flex flex-wrap items-center gap-2">
												<span className="font-medium text-sm">
													{revision.key}
												</span>
												<Badge
													variant={
														revision.status === "published"
															? "default"
															: "outline"
													}
												>
													{revision.status === "published"
														? "Actuelle"
														: "Dépréciée"}
												</Badge>
												{mine && (
													<Badge variant="secondary">Votre révision</Badge>
												)}
												{newer && revision.impact && (
													<Badge
														variant={
															revision.impact === "major"
																? "default"
																: "outline"
														}
													>
														{revision.impact === "major"
															? "Majeure"
															: "Mineure"}
													</Badge>
												)}
											</div>
											<p className="whitespace-pre-wrap text-muted-foreground text-sm">
												{revision.purpose}
											</p>
										</div>
										{followed && (
											<span
												className="mt-0.5 flex shrink-0 items-center gap-1 text-muted-foreground text-xs"
												title={followed.label}
											>
												<Icon name={followed.icon} className="size-5" />
												<span className="sr-only">{followed.label}</span>
											</span>
										)}
									</li>
								);
							})}
						</ol>
					</div>
				</SheetContent>
			</Sheet>
			{dialogOpen && enrollment && (
				<UpdateDialog
					enrollmentId={enrollment.id}
					onClose={() => setDialogOpen(false)}
				/>
			)}
		</>
	);
}
