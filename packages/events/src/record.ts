import { db, schema } from "@youlearn/db";
import type { EventType } from "./index";

type Logger = Pick<Console, "error">;

export type EventInput = {
	type: EventType;
	/** Who did it. Omit (or null) for the system itself (startup seeds...). */
	actor?: { id: string; label: string } | null;
	/** What it was done to. */
	target?: { type: string; id: string; label?: string | null } | null;
	/** Details that depend on the event type (changed fields...). Never put secrets in it. */
	metadata?: Record<string, unknown>;
};

/**
 * Appends an event to the log. Labels are snapshots: the log must stay readable once the actor or the
 * target is deleted, which is why there are no foreign keys.
 *
 * Never throws: events are recorded after the action they describe has been committed, so a logging failure
 * is reported on the logger but must not turn a successful action into an error.
 */
export async function recordEvent(
	{ type, actor, target, metadata }: EventInput,
	logger: Logger = console,
) {
	try {
		await db.insert(schema.event).values({
			type,
			actorId: actor?.id ?? null,
			actorLabel: actor?.label ?? null,
			targetType: target?.type ?? null,
			targetId: target?.id ?? null,
			targetLabel: target?.label ?? null,
			metadata: metadata ?? null,
		});
	} catch (error) {
		logger.error(`Could not record event ${type}`, error);
	}
}
