import type { EnrollmentStatus } from "@youlearn/types";

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
	in_progress: "En cours",
	completed: "Terminé",
	failed: "Échec à l'examen final",
};

export const ENROLLMENT_STATUS_VARIANTS: Record<
	EnrollmentStatus,
	"default" | "secondary" | "outline" | "destructive"
> = {
	in_progress: "secondary",
	completed: "default",
	failed: "destructive",
};
