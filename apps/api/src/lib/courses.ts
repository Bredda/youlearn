import { isAdmin, parseRoles } from "@youlearn/auth/roles";
import {
	and,
	asc,
	count,
	db,
	desc,
	eq,
	exists,
	ilike,
	inArray,
	isNull,
	not,
	or,
	schema,
	sql,
} from "@youlearn/db";
import type {
	CourseGroupTag,
	WriterCourse,
	WriterCoursePage,
	WriterCourseQuery,
} from "@youlearn/types";
import type { FastifyReply, FastifyRequest } from "fastify";
import { escapeLike } from "./sql";

const { course, courseGroup, courseRevision, group, userGroup } = schema;

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
		name: user.name,
		admin: isAdmin(parseRoles(user.role)),
		groupIds: groups.map((g) => g.id),
	};
}

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

	const revisions = await db
		.select({
			courseId: courseRevision.courseId,
			id: courseRevision.id,
			key: courseRevision.key,
			status: courseRevision.status,
		})
		.from(courseRevision)
		.where(
			inArray(
				courseRevision.courseId,
				rows.map((row) => row.id),
			),
		);

	return rows.map((row) => {
		const own = revisions.filter((revision) => revision.courseId === row.id);
		const current: WriterCourse["current"] = {};
		for (const { id, key, status } of own)
			if (status !== "deprecated") current[status] = { id, key };
		return {
			id: row.id,
			name: row.name,
			slug: row.slug,
			description: row.description,
			categories: row.categories,
			imageAssetId: row.imageAssetId,
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
			groups: links
				.filter((link) => link.courseId === row.id)
				.map(({ id, name, system }) => ({ id, name, system })),
			current,
			everPublished: own.some(
				(revision) =>
					revision.status === "published" || revision.status === "deprecated",
			),
		};
	});
}

export async function findCourse(id: string) {
	const [row] = await db
		.select()
		.from(course)
		.where(and(eq(course.id, id), isNull(course.deletedAt)));
	return row && (await withGroups([row]))[0];
}

const sortColumns = {
	name: sql`lower(${course.name})`,
	createdAt: course.createdAt,
	updatedAt: course.updatedAt,
};

/** Courses the actor can edit (an admin: all of them), not archived. */
function scopeOf(actor: CourseActor) {
	return and(
		isNull(course.deletedAt),
		actor.admin
			? undefined
			: inArray(
					course.id,
					db
						.select({ id: courseGroup.courseId })
						.from(courseGroup)
						.where(inArray(courseGroup.groupId, actor.groupIds)),
				),
	);
}

const hasRevision = (status: "draft" | "preview" | "published") =>
	exists(
		db
			.select({ one: sql`1` })
			.from(courseRevision)
			.where(
				and(
					eq(courseRevision.courseId, course.id),
					eq(courseRevision.status, status),
				),
			),
	);

/** Paginated, filtered and sorted courses the actor can edit, plus the options of the filters. */
export async function listCourses(
	actor: CourseActor,
	query: WriterCourseQuery,
): Promise<WriterCoursePage> {
	const { q, groupId, category, status, sort, order, page, pageSize } = query;
	const empty = {
		courses: [],
		total: 0,
		page,
		pageSize,
		categories: [],
		groups: [],
	};
	if (!actor.admin && actor.groupIds.length === 0) return empty;

	const scope = scopeOf(actor);
	const search = q ? `%${escapeLike(q)}%` : undefined;
	const where = and(
		scope,
		search
			? or(ilike(course.name, search), ilike(course.slug, search))
			: undefined,
		groupId
			? inArray(
					course.id,
					db
						.select({ id: courseGroup.courseId })
						.from(courseGroup)
						.where(eq(courseGroup.groupId, groupId)),
				)
			: undefined,
		// Categories are stored lower-cased.
		category
			? sql`${category.toLowerCase()} = any(${course.categories})`
			: undefined,
		status === "none"
			? and(
					not(hasRevision("draft")),
					not(hasRevision("preview")),
					not(hasRevision("published")),
				)
			: status
				? hasRevision(status)
				: undefined,
	);
	const direction = order === "asc" ? asc : desc;

	const [{ total = 0 } = {}] = await db
		.select({ total: count() })
		.from(course)
		.where(where);
	const rows = await db
		.select()
		.from(course)
		.where(where)
		.orderBy(direction(sortColumns[sort]), asc(course.id))
		.limit(pageSize)
		.offset((page - 1) * pageSize);

	const scoped = db.select({ id: course.id }).from(course).where(scope);
	const [courses, categories, groups] = await Promise.all([
		withGroups(rows),
		db
			.selectDistinct({ category: sql<string>`unnest(${course.categories})` })
			.from(course)
			.where(scope)
			.orderBy(sql`1`),
		db
			.select({ id: group.id, name: group.name, system: group.system })
			.from(courseGroup)
			.innerJoin(group, eq(group.id, courseGroup.groupId))
			.where(inArray(courseGroup.courseId, scoped))
			.groupBy(group.id)
			.orderBy(asc(sql`lower(${group.name})`)),
	]);

	return {
		courses,
		total,
		page,
		pageSize,
		categories: categories.map((row) => row.category),
		groups,
	};
}

/**
 * Loads a course for a request on it, or answers 404 / 403 itself (then `reply.sent` is true).
 * Hidden from writers outside its groups only as far as the id goes: they get a 403, not the data.
 */
export async function authorizeCourse(
	request: FastifyRequest,
	reply: FastifyReply,
	id: string,
) {
	const actor = await getCourseActor(request);
	const found = await findCourse(id);
	if (!found) {
		reply.code(404).send({ error: "Course not found" });
		return;
	}
	if (!canEditCourse(actor, found)) {
		reply.code(403).send({ error: "Forbidden" });
		return;
	}
	return { actor, course: found };
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
