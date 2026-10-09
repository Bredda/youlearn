import { type ChangeImpact, chaptersMissingDuration } from "@youlearn/content";
import type {
	CourseContent,
	ReviewerState,
	ReviewSummary,
	ReviewVerdict,
	RevisionStatus,
} from "@youlearn/types";

/**
 * The workflow: draft -> preview -> published -> deprecated, with preview -> draft to rework. There is no way
 * back from deprecated: restoring an old revision means cloning it into a new draft.
 */
export const TRANSITIONS: Record<RevisionStatus, RevisionStatus[]> = {
	draft: ["preview"],
	preview: ["draft", "published"],
	published: ["deprecated"],
	deprecated: [],
};

/**
 * What keeps a draft from going to review: every chapter needs an estimated duration (older drafts predate the
 * field, so saving stays free and only the review step asks). Returns a message, or null when it can go.
 */
export function previewBlocker(content: CourseContent): string | null {
	const missing = chaptersMissingDuration(content);
	if (missing.length === 0) return null;
	const titles = missing
		.slice(0, 3)
		.map((c) => `"${c.title}"`)
		.join(", ");
	const more = missing.length > 3 ? ` and ${missing.length - 3} more` : "";
	return `Every chapter needs an estimated duration before review: missing for ${titles}${more}`;
}

/**
 * Publishing over a published revision must say how much it matters to the learners already on the old one. Nothing
 * is asked when it replaces nothing: no learner can be on a previous published revision then.
 */
export function impactBlocker(
	replacesPublished: boolean,
	impact: ChangeImpact | undefined,
): string | null {
	return replacesPublished && !impact
		? "Say whether this publication is minor or major: learners already on the published revision are affected"
		: null;
}

/** What gets stored on the published revision: the declared impact, only when it replaced a published one. */
export const impactToStore = (
	replacesPublished: boolean,
	impact: ChangeImpact | undefined,
): ChangeImpact | null => (replacesPublished ? (impact ?? null) : null);

/** Statuses of a revision that is being worked on or reviewed: a course has at most one at a time. */
export const OPEN_STATUSES: RevisionStatus[] = ["draft", "preview"];

export const isOpen = (status: RevisionStatus) =>
	OPEN_STATUSES.includes(status);

/** A revision in review stays editable (the writer fixes as the remarks come in); published ones never change. */
export const isEditable = isOpen;

/** What keeps a new revision from being created: another one is still open. Returns a message, or null. */
export function openRevisionBlocker(
	revisions: { key: string; status: RevisionStatus }[],
): string | null {
	const open = revisions.find((r) => isOpen(r.status));
	if (!open) return null;
	const where = open.status === "draft" ? "a draft" : "in review";
	return `Revision ${open.key} is already ${where}: publish or delete it first`;
}

export const MAX_REVIEWERS = 20;

/** The reviewers asked for, without duplicates and in order; null when there are too many. */
export function normalizeReviewerIds(ids: string[]): string[] | null {
	const unique = [...new Set(ids)];
	return unique.length <= MAX_REVIEWERS ? unique : null;
}

/** A revision cannot be reviewed by nobody: a message when no reviewer would be left, null otherwise. */
export function reviewersBlocker(count: number): string | null {
	return count > 0
		? null
		: "Choose at least one reviewer before sending a revision to review";
}

/**
 * What a reviewer thinks of the revision as it is now: their verdict, `none` before they gave one, and `stale`
 * when the revision changed after it (the verdict was about an earlier version). Times are in milliseconds.
 */
export function reviewerState(
	reviewer: {
		verdict: ReviewVerdict | null;
		verdictRevisionUpdatedAt: number | null;
	},
	revisionUpdatedAt: number,
): ReviewerState {
	if (!reviewer.verdict) return "none";
	return reviewer.verdictRevisionUpdatedAt !== null &&
		reviewer.verdictRevisionUpdatedAt >= revisionUpdatedAt
		? reviewer.verdict
		: "stale";
}

export function summarizeReview(
	states: ReviewerState[],
	openThreads: number,
): ReviewSummary {
	const count = (state: ReviewerState) =>
		states.filter((s) => s === state).length;
	return {
		approved: count("approved"),
		changesRequested: count("changes_requested"),
		pending: count("none"),
		stale: count("stale"),
		openThreads,
	};
}

/**
 * What is still open in a review, as messages: publishing is the writer's call, but not without being told (the
 * API asks for a confirmation while this list is not empty).
 */
export function reviewWarnings(summary: ReviewSummary): string[] {
	const plural = (n: number, one: string, many: string) =>
		`${n} ${n === 1 ? one : many}`;
	return [
		summary.changesRequested > 0 &&
			`${plural(summary.changesRequested, "reviewer asked", "reviewers asked")} for changes`,
		summary.pending > 0 &&
			`${plural(summary.pending, "reviewer has", "reviewers have")} not given a verdict`,
		summary.stale > 0 &&
			`${plural(summary.stale, "verdict predates", "verdicts predate")} the latest changes`,
		summary.openThreads > 0 &&
			`${plural(summary.openThreads, "remark is", "remarks are")} still open`,
	].filter((message): message is string => message !== false);
}
