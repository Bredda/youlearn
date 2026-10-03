import type { AssignableGroups, WriterCoursePage } from "@youlearn/types";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CoursesManager } from "@/components/writer/courses-manager";
import { apiFetch } from "@/lib/api";
import {
	coursesQueryToSearchParams,
	parseCoursesQuery,
} from "@/lib/courses-query";

export const metadata: Metadata = { title: "Cours" };

export default async function WriterCoursesPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const query = parseCoursesQuery(await searchParams);

	const [coursesResponse, groupsResponse] = await Promise.all([
		apiFetch(`/api/writer/courses?${coursesQueryToSearchParams(query)}`),
		apiFetch("/api/writer/groups"),
	]);
	if (!coursesResponse.ok || !groupsResponse.ok)
		throw new Error("Impossible de charger les cours");
	const page = (await coursesResponse.json()) as WriterCoursePage;
	const { groups } = (await groupsResponse.json()) as AssignableGroups;

	// The last page no longer exists (e.g. its only course was deleted): go to the new last one.
	const pageCount = Math.max(1, Math.ceil(page.total / query.pageSize));
	if (query.page > pageCount) {
		const params = coursesQueryToSearchParams({ ...query, page: pageCount });
		redirect(`/writer/courses${params.size ? `?${params}` : ""}`);
	}

	return <CoursesManager {...page} query={query} assignableGroups={groups} />;
}
