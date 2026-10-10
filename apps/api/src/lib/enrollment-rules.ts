import { type ChangeImpact, combinedImpact } from "@youlearn/content";

/** What the rules need of a revision that was published at some point: published now, or deprecated since. */
export type PublishedRevision = {
	id: string;
	status: string;
	/** Publishing and deprecating both bump it, and only one revision is published at a time: it orders the history. */
	updatedAt: Date | number;
	changeImpact: ChangeImpact | null;
};

const time = (value: Date | number) =>
	typeof value === "number" ? value : value.getTime();

/**
 * The revisions published after the one a learner follows, oldest first. Empty when the learner is on the published
 * one, when their revision is unknown, or when nothing is published now (there is nowhere to move to).
 *
 * Their revision was deprecated when the next one was published, so everything published from that moment on
 * counts: `>=` because both statements of that publication can share a millisecond.
 */
export function revisionsSince(
	revisions: readonly PublishedRevision[],
	learnerRevisionId: string,
): PublishedRevision[] {
	const mine = revisions.find((revision) => revision.id === learnerRevisionId);
	if (!mine || mine.status !== "deprecated") return [];
	const later = revisions
		.filter(
			(revision) =>
				revision.id !== mine.id &&
				(revision.status === "published" || revision.status === "deprecated") &&
				time(revision.updatedAt) >= time(mine.updatedAt),
		)
		.sort((a, b) => time(a.updatedAt) - time(b.updatedAt));
	return later.some((revision) => revision.status === "published") ? later : [];
}

/**
 * How much it matters to a learner to move to the revision published now: `minor` only when every revision published
 * since theirs was, `major` otherwise (a revision published without a declared impact counts as major), null when
 * there is nothing to move to.
 */
export function updateLevelFor(
	revisions: readonly PublishedRevision[],
	learnerRevisionId: string,
): ChangeImpact | null {
	return combinedImpact(
		revisionsSince(revisions, learnerRevisionId).map((r) => r.changeImpact),
	);
}
