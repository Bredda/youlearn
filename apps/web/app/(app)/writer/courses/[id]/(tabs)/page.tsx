import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CurrentRevisions } from "@/components/writer/current-revisions";
import { apiFetch } from "@/lib/api";
import { getWriterCourse, getWriterRevisions } from "@/lib/writer-data";

export const metadata: Metadata = { title: "Cours" };

export default async function WriterCoursePage(
	props: PageProps<"/writer/courses/[id]">,
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
		<CurrentRevisions
			course={course}
			revisions={revisions}
			suggestedKey={key}
		/>
	);
}
