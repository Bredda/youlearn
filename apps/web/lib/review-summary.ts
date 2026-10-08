import type { ReviewerState, ReviewSummary } from "@youlearn/types";

export const REVIEWER_STATE_LABELS: Record<ReviewerState, string> = {
	approved: "Validé",
	changes_requested: "Modifications demandées",
	stale: "Avis périmé",
	none: "Pas encore d'avis",
};

const plural = (n: number, one: string, many: string) =>
	`${n} ${n === 1 ? one : many}`;

/** What is still open in a review, in words (the API asks for a confirmation to publish while there is any). */
export function reviewWarnings(summary: ReviewSummary | null): string[] {
	if (!summary) return [];
	return [
		summary.changesRequested > 0 &&
			`${plural(summary.changesRequested, "relecteur demande", "relecteurs demandent")} des modifications`,
		summary.pending > 0 &&
			`${plural(summary.pending, "relecteur n'a pas", "relecteurs n'ont pas")} encore donné d'avis`,
		summary.stale > 0 &&
			`${plural(summary.stale, "avis date", "avis datent")} d'avant les dernières modifications`,
		summary.openThreads > 0 &&
			`${plural(summary.openThreads, "remarque reste ouverte", "remarques restent ouvertes")}`,
	].filter((message): message is string => message !== false);
}
