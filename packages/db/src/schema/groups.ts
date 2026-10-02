import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import {
	index,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

/** Admin-managed tags. A user can belong to several; courses/programs will be tagged the same way. */
export const group = pgTable(
	"group",
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		name: text().notNull(),
		createdAt: timestamp().notNull().defaultNow(),
		updatedAt: timestamp()
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		uniqueIndex("group_name_lower_idx").on(sql`lower(${table.name})`),
	],
);

export const userGroup = pgTable(
	"user_group",
	{
		userId: text()
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		groupId: text()
			.notNull()
			.references(() => group.id, { onDelete: "cascade" }),
		createdAt: timestamp().notNull().defaultNow(),
	},
	(table) => [
		primaryKey({ columns: [table.userId, table.groupId] }),
		index("user_group_group_id_idx").on(table.groupId),
	],
);
