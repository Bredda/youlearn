import type { EnrollmentStatus } from "@youlearn/types";
import type { IconName } from "@/lib/icons";

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
	in_progress: "En cours",
	completed: "Terminé",
	failed: "Échec à l'examen final",
	superseded: "Remplacée par une mise à jour",
};

export const ENROLLMENT_STATUS_VARIANTS: Record<
	EnrollmentStatus,
	"default" | "secondary" | "outline" | "destructive"
> = {
	in_progress: "secondary",
	completed: "default",
	failed: "destructive",
	superseded: "outline",
};

export const ENROLLMENT_STATUS_ICONS: Record<EnrollmentStatus, IconName> = {
	in_progress: "inProgress",
	completed: "done",
	failed: "alert",
	superseded: "history",
};

/** The statuses an enrollment shows in a list or a filter: a superseded one is only reached through its successor. */
export const LISTED_ENROLLMENT_STATUSES = [
	"in_progress",
	"completed",
	"failed",
] as const satisfies readonly EnrollmentStatus[];
