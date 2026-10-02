import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	bigint,
	index,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { group } from "./groups";

/**
 * A course. Its content lives in revisions; name, description and categories are not versioned.
 * `categories` are free discovery tags, unrelated to groups (which control access).
 * A course that was published once is archived (`deletedAt`) instead of deleted, to keep what learners did.
 */
export const course = pgTable(
	"course",
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		name: text().notNull(),
		slug: text().notNull(),
		description: text().notNull().default(""),
		categories: text().array().notNull().default([]),
		/** Optional cover, one of the course's assets. */
		imageAssetId: text().references((): AnyPgColumn => courseAsset.id, {
			onDelete: "set null",
		}),
		deletedAt: timestamp(),
		createdAt: timestamp().notNull().defaultNow(),
		updatedAt: timestamp()
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		// An archived course frees its slug.
		uniqueIndex("course_slug_idx")
			.on(table.slug)
			.where(sql`${table.deletedAt} is null`),
		index("course_categories_idx").using("gin", table.categories),
	],
);

/** Groups a course is visible to. A group in use cannot be deleted (`restrict`). */
export const courseGroup = pgTable(
	"course_group",
	{
		courseId: text()
			.notNull()
			.references(() => course.id, { onDelete: "cascade" }),
		groupId: text()
			.notNull()
			.references(() => group.id, { onDelete: "restrict" }),
		createdAt: timestamp().notNull().defaultNow(),
	},
	(table) => [
		primaryKey({ columns: [table.courseId, table.groupId] }),
		index("course_group_group_id_idx").on(table.groupId),
	],
);

/**
 * A file uploaded for a course (images now, videos and documents later). The blob lives in object storage under a
 * key derived from `sha256`, so identical uploads are stored once and a stored blob never changes; revisions refer
 * to assets by `id`, which makes cloning a revision free.
 */
export const courseAsset = pgTable(
	"course_asset",
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		courseId: text()
			.notNull()
			.references(() => course.id, { onDelete: "cascade" }),
		sha256: text().notNull(),
		contentType: text().notNull(),
		size: bigint({ mode: "number" }).notNull(),
		filename: text().notNull(),
		createdAt: timestamp().notNull().defaultNow(),
	},
	(table) => [
		uniqueIndex("course_asset_hash_idx").on(table.courseId, table.sha256),
	],
);

/**
 * What a revision teaches: an ordered list of lessons. Versioned so the shape can evolve (sections, videos,
 * quizzes...) with old revisions still readable. Markdown bodies are inline for now.
 */
export type CourseContent = {
	version: 1;
	lessons: CourseLesson[];
};

export type CourseLesson = {
	id: string;
	title: string;
	type: "markdown";
	body: string;
};

export const EMPTY_COURSE_CONTENT: CourseContent = { version: 1, lessons: [] };

export const revisionStatus = pgEnum("revision_status", [
	"draft",
	"preview",
	"published",
	"deprecated",
]);

/**
 * One version of a course. A course has at most one `draft`, one `preview` and one `published` revision at the
 * same time (any number of `deprecated` ones), and a published revision never changes.
 */
export const courseRevision = pgTable(
	"course_revision",
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		courseId: text()
			.notNull()
			.references(() => course.id, { onDelete: "cascade" }),
		/** The business id (e.g. `whispering_toucan`), unique per course and immutable. */
		key: text().notNull(),
		status: revisionStatus().notNull().default("draft"),
		content: jsonb()
			.$type<CourseContent>()
			.notNull()
			.default(EMPTY_COURSE_CONTENT),
		/** The revision this one was cloned from, if any. */
		parentId: text().references((): AnyPgColumn => courseRevision.id, {
			onDelete: "set null",
		}),
		createdAt: timestamp().notNull().defaultNow(),
		updatedAt: timestamp()
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		uniqueIndex("course_revision_key_idx").on(table.courseId, table.key),
		uniqueIndex("course_revision_active_status_idx")
			.on(table.courseId, table.status)
			.where(sql`${table.status} <> 'deprecated'`),
	],
);

/** Users who changed a revision. No foreign key: the name is a snapshot that survives the user's deletion. */
export const revisionContributor = pgTable(
	"revision_contributor",
	{
		revisionId: text()
			.notNull()
			.references(() => courseRevision.id, { onDelete: "cascade" }),
		userId: text().notNull(),
		userLabel: text().notNull(),
		createdAt: timestamp().notNull().defaultNow(),
		updatedAt: timestamp()
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [primaryKey({ columns: [table.revisionId, table.userId] })],
);
