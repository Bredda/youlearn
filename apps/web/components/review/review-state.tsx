import type { WriterRevision } from "@youlearn/types";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { REVIEWER_STATE_LABELS, reviewWarnings } from "@/lib/review-summary";

const STATE_VARIANTS = {
	approved: "default",
	changes_requested: "destructive",
	stale: "outline",
	none: "secondary",
} as const;

/** Where the review of a revision stands: each reviewer's verdict and what is still open. */
export function ReviewState({ revision }: { revision: WriterRevision }) {
	if (revision.status !== "preview") return null;
	const warnings = reviewWarnings(revision.review);
	return (
		<section className="flex flex-col gap-2 rounded-md border px-3 py-2">
			<h2 className="flex items-center gap-1.5 font-medium text-sm">
				<Icon name="preview" /> État de la relecture
			</h2>
			{revision.reviewers.length === 0 ? (
				<p className="text-muted-foreground text-sm">Aucun relecteur.</p>
			) : (
				<ul className="flex flex-wrap gap-2">
					{revision.reviewers.map((reviewer) => (
						<li key={reviewer.userId}>
							<Badge variant={STATE_VARIANTS[reviewer.state]}>
								{reviewer.name} · {REVIEWER_STATE_LABELS[reviewer.state]}
							</Badge>
						</li>
					))}
				</ul>
			)}
			<p className="text-muted-foreground text-sm">
				{warnings.length === 0
					? "Rien ne s'oppose à la publication."
					: `Avant de publier : ${warnings.join(", ")}.`}
			</p>
		</section>
	);
}
