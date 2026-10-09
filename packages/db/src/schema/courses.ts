import { randomUUID } from "node:crypto";
import { type CourseContent, EMPTY_COURSE_CONTENT } from "@youlearn/content";
import { sql } from "drizzle-orm";
import {
	type AnyPgColumn,
	bigint,
	boolean,
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
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

export const revisionStatus = pgEnum("revision_status", [
	"draft",
	"preview",
	"published",
	"deprecated",
]);

/** What a publication means to the learners already on the previous revision (see `ChangeImpact` in `@youlearn/content`). */
export const revisionChangeImpact = pgEnum("revision_change_impact", [
	"minor",
	"major",
]);

/**
 * One version of a course. A course has at most one open revision (`draft` or `preview`) and one `published`
 * revision at the same time (any number of `deprecated` ones), and a published revision never changes.
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
		/** Why this revision exists, written by whoever creates it (mandatory, also when cloning). */
		purpose: text().notNull(),
		/**
		 * Declared by the writer when this revision replaces a published one. Null when it replaced nothing (or was
		 * published before the field existed): a revision without one counts as `major`.
		 */
		changeImpact: revisionChangeImpact(),
		content: jsonb()
			.$type<CourseContent>()
			.notNull()
			.default(EMPTY_COURSE_CONTENT),
		/** Sum of the chapters' estimated durations, derived from `content` on every save (for lists and the catalog). */
		durationMinutes: integer().notNull().default(0),
		/** Mirrors `content.certifying`, derived on every save. */
		certifying: boolean().notNull().default(false),
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
		// One revision at a time is being worked on or reviewed (a draft or a preview, never both) ...
		uniqueIndex("course_revision_open_idx")
			.on(table.courseId)
			.where(sql`${table.status} in ('draft', 'preview')`),
		// ... and one is published (any number are deprecated).
		uniqueIndex("course_revision_published_idx")
			.on(table.courseId)
			.where(sql`${table.status} = 'published'`),
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

export const reviewVerdict = pgEnum("review_verdict", [
	"approved",
	"changes_requested",
]);

/**
 * Users picked by a writer to review a revision. Being assigned is what gives access to it (there is no global
 * reviewer role), and only while the revision is in `preview`. The rows stay as history once it moves on.
 */
export const revisionReviewer = pgTable(
	"revision_reviewer",
	{
		revisionId: text()
			.notNull()
			.references(() => courseRevision.id, { onDelete: "cascade" }),
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		/** The reviewer's opinion, null until they give one. */
		verdict: reviewVerdict(),
		verdictAt: timestamp(),
		/**
		 * `updatedAt` of the revision when the verdict was given: a later change to the revision makes the verdict
		 * stale (it was about an earlier version).
		 */
		verdictRevisionUpdatedAt: timestamp(),
		createdAt: timestamp().notNull().defaultNow(),
	},
	(table) => [
		primaryKey({ columns: [table.revisionId, table.userId] }),
		index("revision_reviewer_user_id_idx").on(table.userId),
	],
);

export const reviewTargetType = pgEnum("review_target_type", [
	"revision",
	"chapter",
	"block",
	"question",
]);

export const reviewThreadStatus = pgEnum("review_thread_status", [
	"open",
	"resolved",
]);

/**
 * A remark made while a revision is reviewed. A thread is a root comment (`parentId` null, which holds the target,
 * the quoted excerpt and the status) and its replies. The target is named by the stable ids of the content, so a
 * remark follows its element through edits; authors are snapshots (no foreign key) so the history survives
 * the deletion of an account. Kept with the revision.
 */
export const reviewComment = pgTable(
	"review_comment",
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		revisionId: text()
			.notNull()
			.references(() => courseRevision.id, { onDelete: "cascade" }),
		parentId: text().references((): AnyPgColumn => reviewComment.id, {
			onDelete: "cascade",
		}),
		/** Root comments only: what the thread is about. */
		targetType: reviewTargetType(),
		chapterId: text(),
		/** The block or question id for those two target types. */
		itemId: text(),
		/** Root comments only: the text the reviewer had selected, shown for context (never used to locate). */
		quote: text(),
		body: text().notNull(),
		authorId: text().notNull(),
		authorLabel: text().notNull(),
		/** Root comments only. */
		status: reviewThreadStatus().notNull().default("open"),
		resolvedById: text(),
		resolvedByLabel: text(),
		resolvedAt: timestamp(),
		createdAt: timestamp().notNull().defaultNow(),
	},
	(table) => [
		index("review_comment_revision_id_idx").on(table.revisionId),
		index("review_comment_parent_id_idx").on(table.parentId),
	],
);
