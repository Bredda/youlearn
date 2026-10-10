import type { EnrollmentView } from "@youlearn/types";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
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

	const view = (await response.json()) as EnrollmentView;
	const chapterId = typeof chapter === "string" ? chapter : undefined;
	// A page left open on an enrollment that was moved to a newer revision goes where the learner continues. The
	// chapter ids are the same from one revision to the next.
	if (view.enrollment.successorId)
		redirect(
			`/learn/${view.enrollment.successorId}${chapterId ? `?chapter=${encodeURIComponent(chapterId)}` : ""}`,
		);

	return <LearnPlayer view={view} chapterId={chapterId} />;
}
