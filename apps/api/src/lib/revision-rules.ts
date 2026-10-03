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
