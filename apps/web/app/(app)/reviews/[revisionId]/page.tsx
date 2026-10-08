import type { ReviewThread, ReviewView } from "@youlearn/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReviewViewer } from "@/components/review/review-viewer";
import { apiFetch } from "@/lib/api";

export const metadata: Metadata = { title: "Relecture" };

export default async function ReviewPage(
	props: PageProps<"/reviews/[revisionId]">,
) {
	const { revisionId } = await props.params;
	const response = await apiFetch(
		`/api/reviews/${encodeURIComponent(revisionId)}`,
	);
	if (response.status === 404) notFound();
	if (!response.ok) throw new Error("Impossible de charger la relecture");

	const view = (await response.json()) as ReviewView;
	const remarks = await apiFetch(`/api/revisions/${revisionId}/comments`);
	if (!remarks.ok) throw new Error("Impossible de charger les remarques");
	const initial = (await remarks.json()) as {
		threads: ReviewThread[];
		canWrite: boolean;
	};
	return <ReviewViewer view={view} initialRemarks={initial} />;
}
