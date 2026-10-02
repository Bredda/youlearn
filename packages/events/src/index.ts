// Pure module (no server/db imports): shared by the API, Better Auth hooks and the browser.
//
// Every event has a type `feature.action` (e.g. `user.create`). To log a new kind of event, add its action under
// its feature below: the types, the API filters and the UI filter follow. The web app must then label it
// (`lib/events.ts` fails to compile until it does). The `event.type` column is plain text, so no migration is needed.

export const EVENTS = {
	user: [
		"create",
		"update",
		"delete",
		"set-role",
		"set-password",
		"ban",
		"unban",
		"set-groups",
	],
	group: ["create", "update", "delete"],
} as const;

export type EventFeature = keyof typeof EVENTS;
export type EventAction<F extends EventFeature = EventFeature> =
	(typeof EVENTS)[F][number];

/** `feature.action`, e.g. "user.create". */
export type EventType = {
	[F in EventFeature]: `${F}.${EventAction<F>}`;
}[EventFeature];

/** What the events listing can be filtered on: a whole feature ("user") or a single type ("user.create"). */
export type EventFilter = EventFeature | EventType;

export const EVENT_FEATURES = Object.keys(EVENTS) as EventFeature[];

export const EVENT_TYPES = EVENT_FEATURES.flatMap((feature) =>
	EVENTS[feature].map((action) => `${feature}.${action}` as EventType),
);

/** Tuple-typed so it can feed `z.enum`. */
export const EVENT_FILTERS = [...EVENT_FEATURES, ...EVENT_TYPES] as [
	EventFilter,
	...EventFilter[],
];

export const eventFeature = (type: EventType): EventFeature =>
	type.split(".")[0] as EventFeature;
