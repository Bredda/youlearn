import type { CourseEnrollmentPage } from "@youlearn/types";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LearnersManager } from "@/components/writer/learners-manager";
import { apiFetch } from "@/lib/api";
import {
	learnersQueryToSearchParams,
	parseLearnersQuery,
} from "@/lib/learners-query";
import { getWriterCourse } from "@/lib/writer-data";

export const metadata: Metadata = { title: "Apprenants" };

export default async function LearnersPage(
	props: PageProps<"/writer/courses/[id]/learners">,
) {
	const { id } = await props.params;
	const query = parseLearnersQuery(await props.searchParams);

	const [course, learnersResponse] = await Promise.all([
		getWriterCourse(id),
		apiFetch(
			`/api/writer/courses/${encodeURIComponent(id)}/enrollments?${learnersQueryToSearchParams(query)}`,
		),
	]);
	if (!course) notFound();
	if (!learnersResponse.ok)
		throw new Error("Impossible de charger les apprenants");
	const page = (await learnersResponse.json()) as CourseEnrollmentPage;

	// The last page no longer exists: go to the new last one.
	const pageCount = Math.max(1, Math.ceil(page.total / query.pageSize));
	if (query.page > pageCount) {
		const params = learnersQueryToSearchParams({ ...query, page: pageCount });
		redirect(
			`/writer/courses/${id}/learners${params.size ? `?${params}` : ""}`,
		);
	}

	return <LearnersManager {...page} courseId={course.id} query={query} />;
}
