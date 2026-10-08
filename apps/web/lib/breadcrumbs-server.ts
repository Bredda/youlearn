import {
	buildBreadcrumb,
	type Crumb,
	type CrumbNames,
} from "@/lib/breadcrumbs";
import { getWriterCourse, getWriterRevisions } from "@/lib/writer-data";

/** The breadcrumb of a path, with the names of the course and revision it points at read from the API. */
export async function resolveBreadcrumb(segments: string[]): Promise<Crumb[]> {
	const names: CrumbNames = {};
	const [area, section, id, tab, revisionId] = segments;
	if (area === "writer" && section === "courses" && id) {
		try {
			const [course, revisions] = await Promise.all([
				getWriterCourse(id),
				tab === "revisions" && revisionId ? getWriterRevisions(id) : null,
			]);
			if (course) names.course = course.name;
			const revision = revisions?.find((r) => r.id === revisionId);
			if (revision) names.revision = revision.key;
		} catch {
			// The page reports the failure itself; the breadcrumb falls back to generic labels.
		}
	}
	return buildBreadcrumb(segments, names);
}
