import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RevisionHistory } from "@/components/writer/revision-history";
import { apiFetch } from "@/lib/api";
import { getWriterCourse, getWriterRevisions } from "@/lib/writer-data";

// The revisions that were published and then replaced (see `RevisionHistory`).
export const metadata: Metadata = { title: "Anciennes révisions" };

export default async function HistoryPage(
	props: PageProps<"/writer/courses/[id]/history">,
) {
	const { id } = await props.params;
	const [course, revisions, keyResponse] = await Promise.all([
		getWriterCourse(id),
		getWriterRevisions(id),
		apiFetch("/api/writer/revision-key"),
	]);
	if (!course) notFound();
	const { key } = keyResponse.ok
		? ((await keyResponse.json()) as { key: string })
		: { key: "" };

	return (
		<RevisionHistory course={course} revisions={revisions} suggestedKey={key} />
	);
}
