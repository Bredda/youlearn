import type { EnrollmentView } from "@youlearn/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LearnPlayer } from "@/components/learn/learn-player";
import { apiFetch } from "@/lib/api";

export const metadata: Metadata = { title: "Mon cours" };

export default async function LearnPage(
	props: PageProps<"/learn/[enrollmentId]">,
) {
	const { enrollmentId } = await props.params;
	const { chapter } = await props.searchParams;
	const response = await apiFetch(
		`/api/enrollments/${encodeURIComponent(enrollmentId)}`,
	);
	if (response.status === 404) notFound();
	if (!response.ok) throw new Error("Impossible de charger le cours");

	return (
		<LearnPlayer
			view={(await response.json()) as EnrollmentView}
			chapterId={typeof chapter === "string" ? chapter : undefined}
		/>
	);
}
