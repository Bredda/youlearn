import type { EventFeature, EventType } from "@youlearn/events";
import type { AdminEvent } from "@youlearn/types";
import { ROLE_LABELS } from "@/lib/roles";

// Adding an event type to `@youlearn/events` makes these records fail to compile until it is labelled.

export const FEATURE_LABELS: Record<EventFeature, string> = {
	user: "Utilisateurs",
};

export const EVENT_LABELS: Record<EventType, string> = {
	"user.create": "Création",
	"user.update": "Modification",
	"user.delete": "Suppression",
	"user.set-role": "Changement de rôles",
	"user.set-password": "Changement de mot de passe",
	"user.ban": "Bannissement",
	"user.unban": "Levée de bannissement",
	"user.set-groups": "Changement de groupes",
};

/** Rows may carry a type that no longer exists in the registry: show it as is. */
export function eventLabel(type: string) {
	return (EVENT_LABELS as Record<string, string | undefined>)[type] ?? type;
}

/** "Utilisateurs · Création" */
export function eventFullLabel(type: EventType) {
	const feature = type.split(".")[0] as EventFeature;
	return `${FEATURE_LABELS[feature]} · ${EVENT_LABELS[type]}`;
}

const FIELD_LABELS: Record<string, string> = { name: "Nom", email: "Email" };

const strings = (value: unknown): string[] =>
	Array.isArray(value) ? value.map(String) : [];
const roles = (value: unknown) =>
	strings(value)
		.map((role) => (ROLE_LABELS as Record<string, string>)[role] ?? role)
		.join(", ") || "aucun";
const names = (value: unknown) => strings(value).join(", ") || "aucun";

/** One-line summary of what an event changed, from its metadata. Null when the type says it all. */
export function describeEvent({
	type,
	metadata,
}: Pick<AdminEvent, "type" | "metadata">): string | null {
	const data = metadata ?? {};
	switch (type) {
		case "user.create":
			return `Rôles : ${roles(data.roles)}`;
		case "user.update": {
			const changes = Object.entries(
				(data.changes ?? {}) as Record<
					string,
					{ from?: unknown; to?: unknown }
				>,
			);
			return (
				changes
					.map(
						([field, { from, to }]) =>
							`${FIELD_LABELS[field] ?? field} : ${from ?? "—"} → ${to ?? "—"}`,
					)
					.join(" ; ") || null
			);
		}
		case "user.set-role":
			return `Rôles : ${roles(data.from)} → ${roles(data.to)}`;
		case "user.set-groups":
			return `Groupes : ${names(data.from)} → ${names(data.to)}`;
		case "user.ban":
			return typeof data.reason === "string" ? `Motif : ${data.reason}` : null;
		default:
			return null;
	}
}
