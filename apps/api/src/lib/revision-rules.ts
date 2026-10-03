import type { RevisionStatus } from "@youlearn/types";

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
