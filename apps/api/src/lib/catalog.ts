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
	or,
	schema,
	sql,
} from "@youlearn/db";
import type { CatalogPage, CatalogQuery } from "@youlearn/types";
import type { CourseActor } from "./courses";
import { escapeLike } from "./sql";

const { course, courseGroup, courseRevision, group } = schema;

const sortColumns = {
	name: sql`lower(${course.name})`,
	publishedAt: courseRevision.updatedAt,
};

/**
 * What a learner sees: living courses with a published revision that are tagged "Commun" or with one of the
 * user's own groups. Everyone gets the same rule, editors and admins included: their own view is the writer area.
 */
function visibleTo(actor: CourseActor) {
	return and(
		isNull(course.deletedAt),
		eq(courseRevision.status, "published"),
		exists(
			db
				.select({ one: sql`1` })
				.from(courseGroup)
				.innerJoin(group, eq(group.id, courseGroup.groupId))
				.where(
					and(
						eq(courseGroup.courseId, course.id),
						actor.groupIds.length > 0
							? or(eq(group.system, true), inArray(group.id, actor.groupIds))
							: eq(group.system, true),
					),
				),
		),
	);
}

/** Paginated, filtered and sorted courses the actor can learn from, plus the options of the filters. */
export async function listCatalog(
	actor: CourseActor,
	query: CatalogQuery,
): Promise<CatalogPage> {
	const { q, category, groupId, sort, order, page, pageSize } = query;
	const search = q ? `%${escapeLike(q)}%` : undefined;
	const published = and(
		eq(courseRevision.courseId, course.id),
		eq(courseRevision.status, "published"),
	);
	const visible = visibleTo(actor);

	const where = and(
		visible,
		search
			? or(ilike(course.name, search), ilike(course.description, search))
			: undefined,
		// Categories are stored lower-cased.
		category
			? sql`${category.toLowerCase()} = any(${course.categories})`
			: undefined,
		// Only the user's own groups can filter: another group id never narrows (or reveals) anything.
		groupId
			? actor.groupIds.includes(groupId)
				? inArray(
						course.id,
						db
							.select({ id: courseGroup.courseId })
							.from(courseGroup)
							.where(eq(courseGroup.groupId, groupId)),
					)
				: sql`false`
			: undefined,
	);
	const direction = order === "asc" ? asc : desc;

	const [{ total = 0 } = {}] = await db
		.select({ total: count() })
		.from(course)
		.innerJoin(courseRevision, published)
		.where(where);
	const rows = await db
		.select({
			id: course.id,
			name: course.name,
			slug: course.slug,
			description: course.description,
			categories: course.categories,
			imageAssetId: course.imageAssetId,
			publishedAt: courseRevision.updatedAt,
		})
		.from(course)
		.innerJoin(courseRevision, published)
		.where(where)
		.orderBy(direction(sortColumns[sort]), asc(course.id))
		.limit(pageSize)
		.offset((page - 1) * pageSize);

	const [categories, groups] = await Promise.all([
		db
			.selectDistinct({ category: sql<string>`unnest(${course.categories})` })
			.from(course)
			.innerJoin(courseRevision, published)
			.where(visible)
			.orderBy(sql`1`),
		actor.groupIds.length === 0
			? []
			: db
					.select({ id: group.id, name: group.name })
					.from(group)
					.where(inArray(group.id, actor.groupIds))
					.orderBy(asc(sql`lower(${group.name})`)),
	]);

	return {
		courses: rows.map((row) => ({
			...row,
			publishedAt: row.publishedAt.toISOString(),
		})),
		total,
		page,
		pageSize,
		categories: categories.map((row) => row.category),
		groups,
	};
}
