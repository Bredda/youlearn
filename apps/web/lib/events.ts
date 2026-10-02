import type { EventFeature, EventType } from "@youlearn/events";
import type { AdminEvent } from "@youlearn/types";
import { ROLE_LABELS } from "@/lib/roles";

// Adding an event type to `@youlearn/events` makes these records fail to compile until it is labelled.

export const FEATURE_LABELS: Record<EventFeature, string> = {
	user: "Utilisateurs",
	group: "Groupes",
	course: "Cours",
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
	"group.create": "Création",
	"group.update": "Renommage",
	"group.delete": "Suppression",
	"course.create": "Création",
	"course.update": "Modification",
	"course.delete": "Suppression",
	"course.set-groups": "Changement de groupes",
};

/** Self-sufficient wording for the table, where the feature is not shown next to the badge. */
export const EVENT_BADGE_LABELS: Record<EventType, string> = {
	"user.create": "Création d'utilisateur",
	"user.update": "Modification d'utilisateur",
	"user.delete": "Suppression d'utilisateur",
	"user.set-role": "Changement de rôles",
	"user.set-password": "Changement de mot de passe",
	"user.ban": "Bannissement d'utilisateur",
	"user.unban": "Levée de bannissement",
	"user.set-groups": "Changement de groupes",
	"group.create": "Création de groupe",
	"group.update": "Renommage de groupe",
	"group.delete": "Suppression de groupe",
	"course.create": "Création de cours",
	"course.update": "Modification de cours",
	"course.delete": "Suppression de cours",
	"course.set-groups": "Changement de groupes d'un cours",
};

/** Rows may carry a type that no longer exists in the registry: show it as is. */
export function eventBadgeLabel(type: string) {
	return (
		(EVENT_BADGE_LABELS as Record<string, string | undefined>)[type] ?? type
	);
}

/** "Utilisateurs · Création" */
export function eventFullLabel(type: EventType) {
	const feature = type.split(".")[0] as EventFeature;
	return `${FEATURE_LABELS[feature]} · ${EVENT_LABELS[type]}`;
}

const FIELD_LABELS: Record<string, string> = {
	name: "Nom",
	email: "Email",
	slug: "Slug",
	description: "Description",
	categories: "Catégories",
};

const strings = (value: unknown): string[] =>
	Array.isArray(value) ? value.map(String) : [];
const roles = (value: unknown) =>
	strings(value)
		.map((role) => (ROLE_LABELS as Record<string, string>)[role] ?? role)
		.join(", ") || "aucun";
/** Event values are strings, or string lists (categories). */
const display = (value: unknown) =>
	(Array.isArray(value) ? value.join(", ") : value) || "—";
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
		case "user.update":
		case "course.update": {
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
							`${FIELD_LABELS[field] ?? field} : ${display(from)} → ${display(to)}`,
					)
					.join(" ; ") || null
			);
		}
		case "user.set-role":
			return `Rôles : ${roles(data.from)} → ${roles(data.to)}`;
		case "user.set-groups":
		case "course.set-groups":
			return `Groupes : ${names(data.from)} → ${names(data.to)}`;
		case "group.update":
			return `Nom : ${data.from ?? "—"} → ${data.to ?? "—"}`;
		case "user.ban":
			return typeof data.reason === "string" ? `Motif : ${data.reason}` : null;
		default:
			return null;
	}
}
