import type { WriterCourse, WriterRevisionDetail } from "@youlearn/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
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

	return <RevisionEditor course={course} revision={revision} />;
}
