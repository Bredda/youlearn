import { env } from "@youlearn/config";
import type {
	AssignableGroups,
	WriterCourse,
	WriterRevision,
} from "@youlearn/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CourseDetail } from "@/components/writer/course-detail";
import { apiFetch } from "@/lib/api";

export const metadata: Metadata = { title: "Cours" };

export default async function WriterCoursePage(
	props: PageProps<"/writer/courses/[id]">,
) {
	const { id } = await props.params;
	const [courseResponse, revisionsResponse, groupsResponse, keyResponse] =
		await Promise.all([
			apiFetch(`/api/writer/courses/${id}`),
			apiFetch(`/api/writer/courses/${id}/revisions`),
			apiFetch("/api/writer/groups"),
			apiFetch("/api/writer/revision-key"),
		]);
	// 403 (not one of the groups of this writer) looks like a missing course.
	if (courseResponse.status === 404 || courseResponse.status === 403)
		notFound();
	if (!courseResponse.ok || !revisionsResponse.ok || !groupsResponse.ok)
		throw new Error("Impossible de charger le cours");

	const { course } = (await courseResponse.json()) as { course: WriterCourse };
	const { revisions } = (await revisionsResponse.json()) as {
		revisions: WriterRevision[];
	};
	const { groups } = (await groupsResponse.json()) as AssignableGroups;
	const { key } = keyResponse.ok
		? ((await keyResponse.json()) as { key: string })
		: { key: "" };

	return (
		<CourseDetail
			course={course}
			revisions={revisions}
			assignableGroups={groups}
			suggestedKey={key}
			webUrl={env.WEB_URL}
		/>
	);
}
