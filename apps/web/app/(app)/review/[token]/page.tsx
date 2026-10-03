import type { ReviewView } from "@youlearn/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReviewViewer } from "@/components/review/review-viewer";
import { apiFetch } from "@/lib/api";

export const metadata: Metadata = { title: "Relecture" };

export default async function ReviewPage(props: PageProps<"/review/[token]">) {
	const { token } = await props.params;
	const response = await apiFetch(`/api/review/${encodeURIComponent(token)}`);
	if (response.status === 404) notFound();
	if (!response.ok) throw new Error("Impossible de charger la relecture");

	return <ReviewViewer view={(await response.json()) as ReviewView} />;
}
