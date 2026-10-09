"use client";

import type { EnrollmentStatus, LearnerRevision } from "@youlearn/types";
import { Icon } from "@/components/icon";
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

/** The icon facing a revision the learner followed, and what it says. */
const FOLLOWED: Record<EnrollmentStatus, { icon: IconName; label: string }> = {
	completed: { icon: "done", label: "Terminée" },
	in_progress: { icon: "inProgress", label: "En cours" },
	failed: { icon: "alert", label: "Échec à l'examen final" },
	superseded: { icon: "history", label: "Suivie, puis mise à jour" },
};

/**
 * The current revision of a course, as a button that opens the list of the revisions that were published (the
 * current one first) with their purpose, and a mark facing the ones the learner completed or is following.
 */
export function RevisionHistory({
	currentKey,
	revisions,
}: {
	currentKey: string;
	revisions: LearnerRevision[];
}) {
	return (
		<Sheet>
			<SheetTrigger
				render={<Button variant="outline" size="sm" />}
				aria-label={`Révision ${currentKey} : voir l'historique des révisions`}
			>
				<Icon name="history" />
				Révision {currentKey}
			</SheetTrigger>
			<SheetContent className="gap-0 sm:max-w-md">
				<SheetHeader>
					<SheetTitle>Révisions du cours</SheetTitle>
					<SheetDescription>
						Du plus récent au plus ancien. Le cours que vous suivez reste dans
						la révision de votre inscription.
					</SheetDescription>
				</SheetHeader>
				<ol className="flex flex-col gap-3 overflow-y-auto p-4">
					{revisions.map((revision) => {
						const followed = revision.enrollmentStatus
							? FOLLOWED[revision.enrollmentStatus]
							: null;
						return (
							<li
								key={revision.key}
								className="flex items-start gap-3 rounded-md border p-3"
							>
								<div className="flex min-w-0 flex-1 flex-col gap-1">
									<div className="flex flex-wrap items-center gap-2">
										<span className="font-medium text-sm">{revision.key}</span>
										<Badge
											variant={
												revision.status === "published" ? "default" : "outline"
											}
										>
											{revision.status === "published"
												? "Actuelle"
												: "Dépréciée"}
										</Badge>
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
			</SheetContent>
		</Sheet>
	);
}
