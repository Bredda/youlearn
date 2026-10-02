import { randomUUID } from "node:crypto";
import {
	index,
	pgTable,
	primaryKey,
	text,
	timestamp,
} from "drizzle-orm/pg-core";
import { group } from "./groups";

/**
 * A course. Its content lives in revisions (not created yet); name, description and categories are
 * not versioned. `categories` are free discovery tags, unrelated to groups (which control access).
 */
export const course = pgTable(
	"course",
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		name: text().notNull(),
		slug: text().notNull().unique(),
		description: text().notNull().default(""),
		categories: text().array().notNull().default([]),
		createdAt: timestamp().notNull().defaultNow(),
		updatedAt: timestamp()
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [index("course_categories_idx").using("gin", table.categories)],
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
