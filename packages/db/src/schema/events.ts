import { randomUUID } from "node:crypto";
import { index, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Append-only log of what happens in the app: who (actor) did what (type, `feature.action`) to what (target) and when.
 * Actor and target are not foreign keys: the log outlives the rows it talks about, hence the label snapshots.
 */
export const event = pgTable(
	"event",
	{
		id: text()
			.primaryKey()
			.$defaultFn(() => randomUUID()),
		type: text().notNull(),
		/** Null when the system itself acted. */
		actorId: text(),
		actorLabel: text(),
		targetType: text(),
		targetId: text(),
		targetLabel: text(),
		metadata: jsonb().$type<Record<string, unknown>>(),
		createdAt: timestamp().notNull().defaultNow(),
	},
	(table) => [
		index("event_created_at_idx").on(table.createdAt),
		index("event_type_created_at_idx").on(table.type, table.createdAt),
		index("event_target_idx").on(table.targetType, table.targetId),
		index("event_actor_id_idx").on(table.actorId),
	],
);
