import type { CourseGroupTag, WriterCourse } from "@youlearn/types";

// Pure rules of the courses domain (no database, no environment): unit-testable on their own.
// `courses.ts` re-exports them, so the rest of the API keeps importing from there.

/**
 * Who is acting on courses. `groupIds` are the groups the user explicitly belongs to: "Commun" is implicit
 * for everyone (never a `user_group` row), so it can never grant write access.
 */
export type CourseActor = {
	id: string;
	/** Email, used as the actor label of events. */
	label: string;
	name: string;
	admin: boolean;
	groupIds: string[];
};

/** An admin edits everything, a writer the courses sharing at least one of their groups. */
export const canEditCourse = (actor: CourseActor, target: WriterCourse) =>
	actor.admin || target.groups.some((g) => actor.groupIds.includes(g.id));

/**
 * Who may read a course (and its files): its editors, the members of one of its groups, and everybody when it is
 * tagged "Commun". Whether a revision is published is the caller's business.
 */
export const canViewCourse = (actor: CourseActor, target: WriterCourse) =>
	canEditCourse(actor, target) ||
	target.groups.some((g) => g.system || actor.groupIds.includes(g.id));

/** "Développement Web 101" -> "developpement-web-101". */
export function slugify(value: string) {
	return value
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 80);
}

/** Trimmed, lower-cased, de-duplicated free tags. */
export function normalizeCategories(categories: string[]) {
	return [
		...new Set(categories.map((c) => c.trim().toLowerCase()).filter(Boolean)),
	];
}

/**
 * The group ids a course ends up with when `requested` is what the actor chose among the groups they manage.
 * Groups the actor cannot manage (other teams, "Commun" for a writer) are kept untouched, so a writer only ever
 * edits their own groups. Returns an error message when the request is not allowed.
 */
export function resolveGroupIds(
	actor: CourseActor,
	manageable: CourseGroupTag[],
	current: CourseGroupTag[],
	requested: string[],
): { ids: string[] } | { error: string; status: 400 | 403 } {
	const manageableIds = new Set(manageable.map((g) => g.id));
	const unique = [...new Set(requested)];
	if (unique.some((id) => !manageableIds.has(id)))
		return actor.admin
			? { error: "Unknown group id", status: 400 }
			: { error: "You can only assign your own groups", status: 403 };
	if (unique.length === 0)
		return { error: "A course needs at least one group", status: 400 };
	const kept = current.filter((g) => !manageableIds.has(g.id)).map((g) => g.id);
	return { ids: [...kept, ...unique] };
}
