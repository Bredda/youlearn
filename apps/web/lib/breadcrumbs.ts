/** One step of the breadcrumb in the site header; the last one is the current page and has no link. */
export type Crumb = { label: string; href?: string };

/** Names that come from data, filled by the server when the path holds the id of a course or a revision. */
export type CrumbNames = { course?: string; revision?: string };

const COURSE_TABS: Record<string, string> = {
	learners: "Apprenants",
	history: "Révisions dépréciées",
};

/**
 * The breadcrumb of a path (its segments, without the route groups), for the pages that have one. The writer
 * area is covered; any other path gives none, to be added here as the other areas get theirs. The only
 * place that knows the labels, so a page never builds its own.
 */
export function buildBreadcrumb(
	segments: string[],
	names: CrumbNames = {},
): Crumb[] {
	const [area, section, id, tab, subId] = segments;
	if (area !== "writer") return [];

	const crumbs: Crumb[] = [{ label: "Formateur" }];
	if (section === "programs") crumbs.push({ label: "Parcours" });
	if (section !== "courses") return withoutLastLink(crumbs);

	crumbs.push({ label: "Cours", href: "/writer/courses" });
	if (!id) return withoutLastLink(crumbs);

	const course = `/writer/courses/${id}`;
	crumbs.push({ label: names.course ?? "Cours", href: course });
	if (!tab) crumbs.push({ label: "Révisions actuelles", href: course });
	else if (tab === "revisions" && subId)
		crumbs.push({
			label: names.revision ? `Révision ${names.revision}` : "Révision",
			href: `${course}/revisions/${subId}`,
		});
	else if (COURSE_TABS[tab])
		crumbs.push({ label: COURSE_TABS[tab], href: `${course}/${tab}` });
	return withoutLastLink(crumbs);
}

/** The current page is the last step: it is shown, not linked. */
function withoutLastLink(crumbs: Crumb[]): Crumb[] {
	return crumbs.map((crumb, index) =>
		index === crumbs.length - 1 ? { label: crumb.label } : crumb,
	);
}
