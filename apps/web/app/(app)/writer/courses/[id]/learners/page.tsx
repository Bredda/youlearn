import type { CourseEnrollmentPage, WriterCourse } from "@youlearn/types";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LearnersManager } from "@/components/writer/learners-manager";
import { apiFetch } from "@/lib/api";
import {
	learnersQueryToSearchParams,
	parseLearnersQuery,
} from "@/lib/learners-query";

export const metadata: Metadata = { title: "Apprenants" };

export default async function LearnersPage(
	props: PageProps<"/writer/courses/[id]/learners">,
) {
	const { id } = await props.params;
	const query = parseLearnersQuery(await props.searchParams);

	const [courseResponse, learnersResponse] = await Promise.all([
		apiFetch(`/api/writer/courses/${encodeURIComponent(id)}`),
		apiFetch(
			`/api/writer/courses/${encodeURIComponent(id)}/enrollments?${learnersQueryToSearchParams(query)}`,
		),
	]);
	// 403 (not one of the groups of this writer) looks like a missing course.
	if (courseResponse.status === 404 || courseResponse.status === 403)
		notFound();
	if (!courseResponse.ok || !learnersResponse.ok)
		throw new Error("Impossible de charger les apprenants");
	const { course } = (await courseResponse.json()) as { course: WriterCourse };
	const page = (await learnersResponse.json()) as CourseEnrollmentPage;

	// The last page no longer exists: go to the new last one.
	const pageCount = Math.max(1, Math.ceil(page.total / query.pageSize));
	if (query.page > pageCount) {
		const params = learnersQueryToSearchParams({ ...query, page: pageCount });
		redirect(
			`/writer/courses/${id}/learners${params.size ? `?${params}` : ""}`,
		);
	}

	return (
		<LearnersManager
			{...page}
			courseId={course.id}
			courseName={course.name}
			query={query}
		/>
	);
}
