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

export type CourseRevision = typeof schema.courseRevision.$inferSelect;
export type NewCourseRevision = typeof schema.courseRevision.$inferInsert;

export type CourseContent = schema.CourseContent;
export type CourseLesson = schema.CourseLesson;

export type CourseAsset = typeof schema.courseAsset.$inferSelect;

export type RevisionStatus = (typeof schema.revisionStatus.enumValues)[number];

/** A revision of a course as listed in the writer area (dates serialized by JSON). */
export type WriterRevision = Pick<
	CourseRevision,
	"id" | "courseId" | "key" | "status" | "parentId" | "previewToken"
> & {
	createdAt: string;
	updatedAt: string;
	contributors: { userId: string; name: string }[];
};

/** A revision with its content, as opened in the editor. */
export type WriterRevisionDetail = WriterRevision & {
	content: CourseContent;
};

/** An uploaded file, as returned by the upload route. */
export type WriterAsset = Pick<
	CourseAsset,
	"id" | "courseId" | "contentType" | "size" | "filename"
>;

/** A course as listed in the writer area (dates serialized by JSON). */
export type WriterCourse = Pick<
	Course,
	"id" | "name" | "slug" | "description" | "categories" | "imageAssetId"
> & {
	createdAt: string;
	updatedAt: string;
	groups: CourseGroupTag[];
	/** The draft, preview and published revisions of the course (at most one each). */
	current: Partial<
		Record<Exclude<RevisionStatus, "deprecated">, { id: string; key: string }>
	>;
	/** Published at least once: the slug is then frozen and only an admin can archive the course. */
	everPublished: boolean;
};

export type WriterCourseSort = "name" | "createdAt" | "updatedAt";

/** Courses that have a revision in this status, or no active revision at all (`none`). */
export type WriterCourseStatus = "draft" | "preview" | "published" | "none";

/** Query of the writer courses listing (filters, sorting, pagination), shared by the API and the web app. */
export type WriterCourseQuery = {
	/** Searches the name and the slug. */
	q?: string;
	groupId?: string;
	category?: string;
	status?: WriterCourseStatus;
	sort: WriterCourseSort;
	order: "asc" | "desc";
	page: number;
	pageSize: number;
};

export type WriterCoursePage = {
	courses: WriterCourse[];
	total: number;
	page: number;
	pageSize: number;
	/** Options of the filters: what the courses of this user use, whatever the current filters are. */
	categories: string[];
	groups: CourseGroupTag[];
};

/** Groups the current user may put on a course: their own for a writer, every group for an admin. */
export type AssignableGroups = { groups: CourseGroupTag[] };

/** What a review link shows: the revision being proofread, read-only. */
export type ReviewView = {
	course: Pick<
		Course,
		"id" | "name" | "description" | "categories" | "imageAssetId"
	>;
	revision: Pick<CourseRevision, "id" | "key">;
	content: CourseContent;
	/** The token of the link, needed to load the files of the revision. */
	token: string;
};
