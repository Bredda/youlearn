import { isAdmin, parseRoles } from "@youlearn/auth/roles";
import {
	and,
	asc,
	db,
	eq,
	ilike,
	inArray,
	or,
	schema,
	sql,
} from "@youlearn/db";
import type { CourseGroupTag, WriterCourse } from "@youlearn/types";
import type { FastifyRequest } from "fastify";
import { escapeLike } from "./sql";

const { course, courseGroup, group, userGroup } = schema;

/**
 * Who is acting on courses. `groupIds` are the groups the user explicitly belongs to: "Commun" is implicit
 * for everyone (never a `user_group` row), so it can never grant write access.
 */
export type CourseActor = {
	id: string;
	label: string;
	admin: boolean;
	groupIds: string[];
};

export async function getCourseActor(
	request: FastifyRequest,
): Promise<CourseActor> {
	const { user } = request.auth ?? {};
	if (!user) throw new Error("getCourseActor needs an authenticated request");
	const groups = await db
		.select({ id: userGroup.groupId })
		.from(userGroup)
		.where(eq(userGroup.userId, user.id));
	return {
		id: user.id,
		label: user.email,
		admin: isAdmin(parseRoles(user.role)),
		groupIds: groups.map((g) => g.id),
	};
}

/** An admin edits everything, a writer the courses sharing at least one of their groups. */
export const canEditCourse = (actor: CourseActor, target: WriterCourse) =>
	actor.admin || target.groups.some((g) => actor.groupIds.includes(g.id));

/** Groups the actor may add to / remove from a course: all of them for an admin, their own for a writer. */
export async function assignableGroups(
	actor: CourseActor,
): Promise<CourseGroupTag[]> {
	if (!actor.admin && actor.groupIds.length === 0) return [];
	return db
		.select({ id: group.id, name: group.name, system: group.system })
		.from(group)
		.where(actor.admin ? undefined : inArray(group.id, actor.groupIds))
		.orderBy(asc(sql`lower(${group.name})`));
}

type CourseRow = typeof course.$inferSelect;

async function withGroups(rows: CourseRow[]): Promise<WriterCourse[]> {
	if (rows.length === 0) return [];
	const links = await db
		.select({
			courseId: courseGroup.courseId,
			id: group.id,
			name: group.name,
			system: group.system,
		})
		.from(courseGroup)
		.innerJoin(group, eq(group.id, courseGroup.groupId))
		.where(
			inArray(
				courseGroup.courseId,
				rows.map((row) => row.id),
			),
		)
		.orderBy(asc(sql`lower(${group.name})`));

	return rows.map((row) => ({
		id: row.id,
		name: row.name,
		slug: row.slug,
		description: row.description,
		categories: row.categories,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
		groups: links
			.filter((link) => link.courseId === row.id)
			.map(({ id, name, system }) => ({ id, name, system })),
	}));
}

export async function findCourse(id: string) {
	const [row] = await db.select().from(course).where(eq(course.id, id));
	return row && (await withGroups([row]))[0];
}

/** Courses the actor can edit, filtered by a name/slug search. */
export async function listCourses(actor: CourseActor, q?: string) {
	if (!actor.admin && actor.groupIds.length === 0) return [];
	const search = q ? `%${escapeLike(q)}%` : undefined;
	const rows = await db
		.select()
		.from(course)
		.where(
			and(
				search
					? or(ilike(course.name, search), ilike(course.slug, search))
					: undefined,
				actor.admin
					? undefined
					: inArray(
							course.id,
							db
								.select({ id: courseGroup.courseId })
								.from(courseGroup)
								.where(inArray(courseGroup.groupId, actor.groupIds)),
						),
			),
		)
		.orderBy(asc(sql`lower(${course.name})`));
	return withGroups(rows);
}

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
