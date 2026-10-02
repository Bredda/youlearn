import type { Role } from "@youlearn/auth/roles";
import type { schema } from "@youlearn/db";
import type { EventFilter } from "@youlearn/events";

// Row types derived from the drizzle schema. Type-only: importing this package never loads the db client.

export type User = typeof schema.user.$inferSelect;
export type NewUser = typeof schema.user.$inferInsert;

export type Session = typeof schema.session.$inferSelect;
export type NewSession = typeof schema.session.$inferInsert;

export type Account = typeof schema.account.$inferSelect;
export type NewAccount = typeof schema.account.$inferInsert;

export type Verification = typeof schema.verification.$inferSelect;
export type NewVerification = typeof schema.verification.$inferInsert;

export type Group = typeof schema.group.$inferSelect;
export type NewGroup = typeof schema.group.$inferInsert;

export type UserGroup = typeof schema.userGroup.$inferSelect;
export type NewUserGroup = typeof schema.userGroup.$inferInsert;

export type PublicGroup = Pick<Group, "id" | "name">;

/** Fields of a user that are safe to expose to the client, with the groups they belong to. */
export type PublicUser = Pick<
	User,
	"id" | "name" | "email" | "emailVerified" | "image"
> & {
	/** A user can hold several roles (`user`, `writer`, `admin`). */
	roles: Role[];
	groups: PublicGroup[];
};

export type GroupWithMemberCount = PublicGroup & {
	memberCount: number;
	/** The built-in "Commun" group: implicit for everyone, cannot be renamed or deleted. */
	system: boolean;
};

/** A user as listed in the admin UI (dates serialized by JSON). */
export type AdminUser = Pick<
	User,
	"id" | "name" | "email" | "emailVerified" | "image" | "banned" | "banReason"
> & {
	roles: Role[];
	createdAt: string;
	groups: PublicGroup[];
};

export type AdminUserPage = {
	users: AdminUser[];
	total: number;
	page: number;
	pageSize: number;
};

export type AdminUserSort = "name" | "email" | "role" | "createdAt";

/** Query of the admin users listing (filters, sorting, pagination), shared by the API and the web app. */
export type AdminUserQuery = {
	q?: string;
	/** Users holding this role (among others). */
	role?: Role;
	status?: "active" | "banned";
	groupId?: string;
	sort: AdminUserSort;
	order: "asc" | "desc";
	page: number;
	pageSize: number;
};

export type Event = typeof schema.event.$inferSelect;
export type NewEvent = typeof schema.event.$inferInsert;

/** An event as listed in the admin UI (dates serialized by JSON). `type` is a plain string: old rows may use a type that no longer exists. */
export type AdminEvent = Pick<
	Event,
	| "id"
	| "type"
	| "actorId"
	| "actorLabel"
	| "targetType"
	| "targetId"
	| "targetLabel"
	| "metadata"
> & { createdAt: string };

export type AdminEventPage = {
	events: AdminEvent[];
	total: number;
	page: number;
	pageSize: number;
};

export type AdminEventSort = "createdAt" | "type" | "actor" | "target";

/** Query of the admin events listing (filters, sorting, pagination), shared by the API and the web app. */
export type AdminEventQuery = {
	/** Searches the actor and target labels. */
	q?: string;
	/** A feature ("user") or a single event type ("user.create"). */
	type?: EventFilter;
	sort: AdminEventSort;
	order: "asc" | "desc";
	page: number;
	pageSize: number;
};

export type Course = typeof schema.course.$inferSelect;
export type NewCourse = typeof schema.course.$inferInsert;

export type CourseGroup = typeof schema.courseGroup.$inferSelect;
export type NewCourseGroup = typeof schema.courseGroup.$inferInsert;

/** A group as attached to a course (`system` = "Commun"). */
export type CourseGroupTag = PublicGroup & { system: boolean };

/** A course as listed in the writer area (dates serialized by JSON). */
export type WriterCourse = Pick<
	Course,
	"id" | "name" | "slug" | "description" | "categories"
> & {
	createdAt: string;
	updatedAt: string;
	groups: CourseGroupTag[];
};

/** Groups the current user may put on a course: their own for a writer, every group for an admin. */
export type AssignableGroups = { groups: CourseGroupTag[] };
