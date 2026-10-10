import type { Role } from "@youlearn/auth/roles";
import type {
	ChangeImpact,
	ChapterKind,
	ChapterState,
	CourseContent,
	LearnerContent,
	LearnerQuestion,
	QuestionCorrection,
	ReviewTarget,
	UpdateSummary,
} from "@youlearn/content";
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

export type {
	Block,
	ChangeImpact,
	Chapter,
	ChapterImpact,
	ChapterKind,
	ChapterState,
	CourseContent,
	MarkdownBlock,
	Question,
	QuestionOption,
	Quiz,
	UpdateChapter,
	UpdateSummary,
	VideoBlock,
} from "@youlearn/content";

export type CourseAsset = typeof schema.courseAsset.$inferSelect;

export type RevisionStatus = (typeof schema.revisionStatus.enumValues)[number];

/** A revision of a course as listed in the writer area (dates serialized by JSON). */
export type WriterRevision = Pick<
	CourseRevision,
	| "id"
	| "courseId"
	| "key"
	| "status"
	| "parentId"
	| "purpose"
	| "durationMinutes"
	| "certifying"
	| "changeImpact"
> & {
	createdAt: string;
	updatedAt: string;
	contributors: { userId: string; name: string }[];
	/** The users asked to review it (they can read it while it is in preview). */
	reviewers: RevisionReviewer[];
	/** Where the review stands; null unless the revision is in review. */
	review: ReviewSummary | null;
};

/** A user picked to review a revision. */
export type ReviewerRef = { userId: string; name: string; email: string };

export type ReviewVerdict = "approved" | "changes_requested";

/** What a reviewer thinks: their verdict, `none` before they gave one, `stale` once the revision changed after it. */
export type ReviewerState = ReviewVerdict | "none" | "stale";

export type RevisionReviewer = ReviewerRef & { state: ReviewerState };

/** Counts that say whether a revision in review is ready to be published (`pending` = no verdict yet). */
export type ReviewSummary = {
	approved: number;
	changesRequested: number;
	pending: number;
	stale: number;
	openThreads: number;
};

/** What publishing a revision would do to the learners, shown to the writer before they choose minor or major. */
export type PublishImpact = {
	/** The published revision it would replace; null for a first publication, which asks for no impact. */
	replaces: { id: string; key: string } | null;
	/** Enrollments in progress on the course, whatever their revision. */
	learnersInProgress: number;
	/** The chapters as a `major` publication would treat them; null when nothing is replaced. */
	summary: UpdateSummary | null;
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

/** A published course as shown in the learner catalog (dates serialized by JSON). */
export type CatalogCourse = Pick<
	Course,
	"id" | "name" | "slug" | "description" | "categories" | "imageAssetId"
> & {
	/** When the revision learners see was published. */
	publishedAt: string;
	/** Estimated total duration of the published revision, in minutes (0 when no chapter is estimated). */
	durationMinutes: number;
	/** The published revision ends with a final exam. */
	certifying: boolean;
	/** The learner's most recent enrollment on the course, whatever its revision. Null when they never started it. */
	enrollmentStatus: EnrollmentStatus | null;
};

/** What the catalog can be filtered on: the status of the learner's latest enrollment, or `none` (never started). */
export type CatalogStatus = EnrollmentStatus | "none";

export type CatalogSort = "name" | "publishedAt";

/** Query of the learner catalog (filters, sorting, pagination), shared by the API and the web app. */
export type CatalogQuery = {
	/** Searches the name and the description. */
	q?: string;
	category?: string;
	/** One of the user's own groups (an admin: any group). */
	groupId?: string;
	status?: CatalogStatus;
	sort: CatalogSort;
	order: "asc" | "desc";
	page: number;
	pageSize: number;
};

export type CatalogPage = {
	courses: CatalogCourse[];
	total: number;
	page: number;
	pageSize: number;
	/** Options of the filters: the categories of the courses the user sees, and their own groups (an admin: all groups but "Commun"). */
	categories: string[];
	groups: PublicGroup[];
};

/** Groups the current user may put on a course: their own for a writer, every group for an admin. */
export type AssignableGroups = { groups: CourseGroupTag[] };

/** What a reviewer sees: the revision they were asked to proofread, read-only. */
export type ReviewView = {
	course: Pick<
		Course,
		"id" | "name" | "description" | "categories" | "imageAssetId"
	>;
	revision: Pick<
		CourseRevision,
		"id" | "key" | "purpose" | "durationMinutes" | "certifying"
	>;
	content: CourseContent;
	/**
	 * What the revision is compared against: its parent, when that one is published or deprecated (never
	 * somebody's unpublished work). The reader can show what changed.
	 */
	base: ReviewBase | null;
	/** The signed-in reviewer's own verdict state. */
	myState: ReviewerState;
};

export type { ReviewTarget };

/** One comment of a review thread (dates serialized by JSON). */
export type ReviewComment = {
	id: string;
	authorId: string;
	author: string;
	body: string;
	createdAt: string;
};

/** A remark on an element of a revision and the replies to it. */
export type ReviewThread = {
	id: string;
	target: ReviewTarget;
	/** The text the reviewer had selected, for context. */
	quote: string | null;
	status: "open" | "resolved";
	resolvedBy: string | null;
	resolvedAt: string | null;
	/** The element it points at is no longer in the content. */
	orphaned: boolean;
	/** The root comment first, then the replies in order. */
	comments: ReviewComment[];
};

/** A revision waiting for the signed-in user's review ("Relectures"). */
export type MyReview = {
	revisionId: string;
	revisionKey: string;
	purpose: string;
	course: Pick<Course, "id" | "name" | "imageAssetId">;
	/** When the revision was last modified (JSON date). */
	updatedAt: string;
};

export type ReviewBase = {
	key: string;
	status: RevisionStatus;
	content: CourseContent;
};

export type EnrollmentStatus =
	(typeof schema.enrollmentStatus.enumValues)[number];

/** A learner's enrollment on a course (dates serialized by JSON). */
export type LearnerEnrollment = {
	id: string;
	status: EnrollmentStatus;
	/** Key of the revision the learner follows (pinned when they started). */
	revisionKey: string;
	startedAt: string;
	finishedAt: string | null;
	/** Score of the final exam, null while it was not taken. */
	finalExamScore: number | null;
	/** A more recent revision has been published since the learner started. */
	outdated: boolean;
	/** The move to the published revision the learner can choose; null when there is none (or they are not in progress). */
	update: UpdateOffer | null;
	/** The move that was made for them and they have not acknowledged yet. */
	notice: EnrollmentNotice | null;
	/** Set on a superseded enrollment: the one that continues it now, where a stale page should go. */
	successorId: string | null;
};

/** The learner's choice of moving to the revision published now, as the player and the lists announce it. */
export type UpdateOffer = {
	level: ChangeImpact;
	/** They chose "later" for this revision: it is not put in front of them again until another is published. */
	postponed: boolean;
};

/** A revision a learner goes through when the course moves on, with what its writer said about it. */
export type UpdateRevision = {
	key: string;
	/** Why it exists, as its writer wrote it. */
	purpose: string;
	/** How much its publication mattered to the learners on the previous one (null: it replaced nothing). */
	impact: ChangeImpact | null;
};

/**
 * Minor publications moved the learner to a newer revision by themselves, and they have not acknowledged it yet:
 * from the revision they last knew to the one they are on, with every revision they went through (several can have
 * been published since they last came).
 */
export type EnrollmentNotice = {
	fromRevisionKey: string;
	toRevisionKey: string;
	revisions: UpdateRevision[];
};

/**
 * What moving to the published revision means for a learner: the chapters to redo, keep, add or drop. Titles and
 * impacts only, never any content or quiz.
 */
export type EnrollmentUpdate = UpdateOffer & {
	targetRevisionKey: string;
	/** Every revision published since the learner's, the target included, oldest first. */
	revisions: UpdateRevision[];
	summary: UpdateSummary;
};

/** A revision that was published, as the course sheet lists it to learners (never a draft or one in review). */
export type LearnerRevision = {
	key: string;
	status: "published" | "deprecated";
	/** Why the revision exists, as its writer wrote it. */
	purpose: string;
	/** How much its publication mattered to the learners on the previous one (null: it replaced nothing). */
	impact: ChangeImpact | null;
	/** The learner's latest enrollment on this revision, null when they never followed it. */
	enrollmentStatus: EnrollmentStatus | null;
};

/** A published course as a learner opens it from the catalog. */
export type LearnerCourse = Pick<
	Course,
	"id" | "name" | "description" | "categories" | "imageAssetId"
> & {
	publishedAt: string;
	/** Key of the revision published now. */
	revisionKey: string;
	/** The revisions that were published, most recent first. */
	revisions: LearnerRevision[];
	durationMinutes: number;
	certifying: boolean;
	chapters: {
		id: string;
		title: string;
		kind: ChapterKind;
		estimatedMinutes: number | null;
	}[];
	/** The learner's latest enrollment, a failed one included (they may start over). */
	enrollment: LearnerEnrollment | null;
};

/** What the course player shows: the pinned revision, without any quiz question nor answer. */
export type EnrollmentView = {
	enrollment: LearnerEnrollment;
	course: Pick<
		Course,
		"id" | "name" | "description" | "categories" | "imageAssetId"
	>;
	revision: Pick<
		CourseRevision,
		"id" | "key" | "durationMinutes" | "certifying"
	>;
	content: LearnerContent;
	/** Where the learner stands in each chapter, by chapter id. A locked chapter comes without its blocks. */
	chapterStates: Record<string, ChapterState>;
	/** Ids of the chapters whose quiz the learner passed at least once. */
	passedQuizzes: string[];
	/** Every attempt at a quiz of this enrollment, oldest first (an open one has no score). */
	attempts: AttemptSummary[];
};

export type AttemptSummary = {
	id: string;
	chapterId: string;
	finalExam: boolean;
	score: number | null;
	passed: boolean | null;
	startedAt: string;
	submittedAt: string | null;
};

/** An attempt in progress: the questions drawn for it, without any answer. */
export type LearnerAttempt = {
	id: string;
	chapterId: string;
	finalExam: boolean;
	questions: LearnerQuestion[];
};

/** The outcome of a submitted attempt. */
export type AttemptResult = {
	score: number;
	passed: boolean;
	passRate: number;
	/** Right answers and explanations, for the quizzes of a chapter. Never for the final exam. */
	corrections: QuestionCorrection[] | null;
	/** The enrollment after this attempt: a final exam passed or failed ends it. */
	enrollmentStatus: EnrollmentStatus;
};

/** An enrollment of the current learner, as listed in "Mes sessions" (dates serialized by JSON). */
export type MyEnrollment = {
	id: string;
	status: EnrollmentStatus;
	courseId: string;
	courseName: string;
	imageAssetId: string | null;
	revisionKey: string;
	certifying: boolean;
	startedAt: string;
	finishedAt: string | null;
	/** A more recent revision has been published since. */
	outdated: boolean;
	update: UpdateOffer | null;
	notice: EnrollmentNotice | null;
	completedChapters: number;
	totalChapters: number;
};

export type CourseEnrollmentSort = "startedAt" | "learner" | "status";

/** Query of the learners of a course (writer area), shared by the API and the web app. */
export type CourseEnrollmentQuery = {
	/** Searches the learner's name and email. */
	q?: string;
	status?: EnrollmentStatus;
	/** Only the learners in progress on a revision older than the published one (`CourseEnrollment.outdated`). */
	outdated?: boolean;
	sort: CourseEnrollmentSort;
	order: "asc" | "desc";
	page: number;
	pageSize: number;
};

/** A learner's enrollment on a course, for the people who write it (traceability). */
export type CourseEnrollment = {
	id: string;
	learner: { id: string; name: string; email: string };
	status: EnrollmentStatus;
	/** The revision the learner follows. */
	revisionKey: string;
	/** In progress on a revision that is no longer the published one: they have not moved to the newer one. */
	outdated: boolean;
	startedAt: string;
	finishedAt: string | null;
	completedChapters: number;
	totalChapters: number;
	/** Number of submitted quiz attempts, the final exam included. */
	attemptCount: number;
	/** Score of the final exam, null while it was not taken. */
	finalExamScore: number | null;
};

export type CourseEnrollmentPage = {
	enrollments: CourseEnrollment[];
	total: number;
	page: number;
	pageSize: number;
};

/** A move of a learner from one revision of the course to a newer one. */
export type EnrollmentMove = {
	fromRevisionKey: string;
	toRevisionKey: string;
	/** When the learner left the old revision. */
	at: string;
	/** Made by a minor publication (true) or chosen by the learner (false); null when the event log has no trace of it. */
	automatic: boolean | null;
	/** Chapters the move sent back; null when the event log has no trace of it. */
	redone: number | null;
};

export type CourseEnrollmentDetail = CourseEnrollment & {
	/** The revisions the learner went through before this one, oldest first (none when they never moved). */
	moves: EnrollmentMove[];
	chapters: {
		id: string;
		title: string;
		kind: ChapterKind;
		completed: boolean;
	}[];
	/** Every attempt, oldest first. */
	attempts: (AttemptSummary & { chapterTitle: string })[];
};
