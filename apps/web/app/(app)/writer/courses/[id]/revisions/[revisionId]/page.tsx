import type {
	ReviewThread,
	WriterCourse,
	WriterRevisionDetail,
} from "@youlearn/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RemarksProvider } from "@/components/review/review-threads";
import { RevisionEditor } from "@/components/writer/revision-editor";
import { apiFetch } from "@/lib/api";

export const metadata: Metadata = { title: "Révision" };

export default async function RevisionPage(
	props: PageProps<"/writer/courses/[id]/revisions/[revisionId]">,
) {
	const { id, revisionId } = await props.params;
	const [courseResponse, revisionResponse] = await Promise.all([
		apiFetch(`/api/writer/courses/${id}`),
		apiFetch(`/api/writer/courses/${id}/revisions/${revisionId}`),
	]);
	const missing = [404, 403];
	if (
		missing.includes(courseResponse.status) ||
		missing.includes(revisionResponse.status)
	)
		notFound();
	if (!courseResponse.ok || !revisionResponse.ok)
		throw new Error("Impossible de charger la révision");

	const { course } = (await courseResponse.json()) as { course: WriterCourse };
	const { revision } = (await revisionResponse.json()) as {
		revision: WriterRevisionDetail;
	};

	// What the editor compares against: the revision this one was cloned from (gone if it was deleted).
	let base: WriterRevisionDetail | null = null;
	if (revision.parentId) {
		const parentResponse = await apiFetch(
			`/api/writer/courses/${id}/revisions/${revision.parentId}`,
		);
		if (parentResponse.ok) {
			base = (
				(await parentResponse.json()) as { revision: WriterRevisionDetail }
			).revision;
		}
	}

	// The remarks of the reviewers (kept as history once the review is over).
	const remarksResponse = await apiFetch(
		`/api/revisions/${revision.id}/comments`,
	);
	const remarks = remarksResponse.ok
		? ((await remarksResponse.json()) as {
				threads: ReviewThread[];
				canWrite: boolean;
			})
		: { threads: [], canWrite: false };

	return (
		<RemarksProvider revisionId={revision.id} initial={remarks}>
			<RevisionEditor course={course} revision={revision} base={base} />
		</RemarksProvider>
	);
}
