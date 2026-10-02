import type { AssignableGroups, WriterCourse } from "@youlearn/types";
import type { Metadata } from "next";
import { CoursesManager } from "@/components/writer/courses-manager";
import { apiFetch } from "@/lib/api";

export const metadata: Metadata = { title: "Cours" };

export default async function WriterCoursesPage() {
	const [coursesResponse, groupsResponse] = await Promise.all([
		apiFetch("/api/writer/courses"),
		apiFetch("/api/writer/groups"),
	]);
	if (!coursesResponse.ok || !groupsResponse.ok)
		throw new Error("Impossible de charger les cours");
	const { courses } = (await coursesResponse.json()) as {
		courses: WriterCourse[];
	};
	const { groups } = (await groupsResponse.json()) as AssignableGroups;

	return <CoursesManager courses={courses} assignableGroups={groups} />;
}
