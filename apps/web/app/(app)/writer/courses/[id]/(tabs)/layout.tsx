import type { AssignableGroups } from "@youlearn/types";
import { notFound } from "next/navigation";
import { CourseHeader } from "@/components/writer/course-header";
import { CourseTabs } from "@/components/writer/course-tabs";
import { apiFetch } from "@/lib/api";
import { getWriterCourse } from "@/lib/writer-data";

/**
 * What the pages of a course share: its heading and the tabs between them (current revisions, learners, old
 * revisions). The revision editor and the comparison are not tabs and live outside this group.
 */
export default async function CourseLayout(
	props: LayoutProps<"/writer/courses/[id]">,
) {
	const { id } = await props.params;
	const [course, groupsResponse] = await Promise.all([
		getWriterCourse(id),
		apiFetch("/api/writer/groups"),
	]);
	if (!course) notFound();
	if (!groupsResponse.ok) throw new Error("Impossible de charger les groupes");
	const { groups } = (await groupsResponse.json()) as AssignableGroups;

	return (
		<div className="flex flex-col gap-4">
			<CourseHeader course={course} assignableGroups={groups} />
			<CourseTabs courseId={course.id} />
			{props.children}
		</div>
	);
}
