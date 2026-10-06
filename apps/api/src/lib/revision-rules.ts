import { chaptersMissingDuration } from "@youlearn/content";
import type { CourseContent, RevisionStatus } from "@youlearn/types";

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
