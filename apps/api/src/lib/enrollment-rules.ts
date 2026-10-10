import { type ChangeImpact, combinedImpact } from "@youlearn/content";

/** What the rules need of a revision that was published at some point: published now, or deprecated since. */
export type PublishedRevision = {
	id: string;
	status: string;
	/** When it became the published one: the order of the publications of a course. */
	publishedAt: Date | number;
	changeImpact: ChangeImpact | null;
};

const time = (value: Date | number) =>
	typeof value === "number" ? value : value.getTime();

const isPublished = (revision: PublishedRevision) =>
	revision.status === "published" || revision.status === "deprecated";

/** Every revision published after the given one, oldest first. Empty when it is unknown. */
export function revisionsAfter<T extends PublishedRevision>(
	revisions: readonly T[],
	revisionId: string,
): T[] {
	const mine = revisions.find((revision) => revision.id === revisionId);
	if (!mine) return [];
	return revisions
		.filter(
			(revision) =>
				revision.id !== mine.id &&
				isPublished(revision) &&
				time(revision.publishedAt) > time(mine.publishedAt),
		)
		.sort((a, b) => time(a.publishedAt) - time(b.publishedAt));
}

/**
 * The revisions published after the one a learner follows, oldest first. Empty when the learner is on the published
 * one, when their revision is unknown, or when nothing is published now (there is nowhere to move to).
 */
export function revisionsSince<T extends PublishedRevision>(
	revisions: readonly T[],
	learnerRevisionId: string,
): T[] {
	const mine = revisions.find((revision) => revision.id === learnerRevisionId);
	if (!mine || mine.status !== "deprecated") return [];
	const later = revisionsAfter(revisions, learnerRevisionId);
	return later.some((revision) => revision.status === "published") ? later : [];
}

/**
 * What was published after `fromRevisionId` up to and including `toRevisionId`, oldest first: the revisions a
 * learner moved through while they were away.
 */
export function revisionsBetween<T extends PublishedRevision>(
	revisions: readonly T[],
	fromRevisionId: string,
	toRevisionId: string,
): T[] {
	const later = revisionsAfter(revisions, fromRevisionId);
	const end = later.findIndex((revision) => revision.id === toRevisionId);
	return end === -1 ? [] : later.slice(0, end + 1);
}

/** What an enrollment says about its own place in that history. */
export type EnrollmentPosition = {
	status: string;
	revisionId: string;
	/** The published revision whose update the learner chose to postpone. */
	updatePostponedRevisionId: string | null;
};

/**
 * Whether the learner put the offer off and nothing since asks for their attention again: a minor publication after
 * it does not (the dialog is not opened again for a typo), a major one, or one published without a declared impact,
 * does.
 */
function stillPostponed(
	revisions: readonly PublishedRevision[],
	postponedRevisionId: string | null,
): boolean {
	if (postponedRevisionId === null) return false;
	if (!revisions.some((revision) => revision.id === postponedRevisionId))
		return false;
	return revisionsAfter(revisions, postponedRevisionId).every(
		(revision) => revision.changeImpact === "minor",
	);
}

/**
 * What the learner can be offered: the level of the move to the published revision, and whether they already put it
 * off. Only an enrollment in progress is offered anything: a finished one stays what it was.
 */
export function updateOfferFor(
	revisions: readonly PublishedRevision[],
	enrollment: EnrollmentPosition,
): { level: ChangeImpact; postponed: boolean } | null {
	if (enrollment.status !== "in_progress") return null;
	const level = updateLevelFor(revisions, enrollment.revisionId);
	if (!level) return null;
	return {
		level,
		postponed: stillPostponed(revisions, enrollment.updatePostponedRevisionId),
	};
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
