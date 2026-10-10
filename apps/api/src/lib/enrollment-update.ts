import { db, eq, schema } from "@youlearn/db";
import type {
	EnrollmentNotice,
	UpdateOffer,
	UpdateRevision,
} from "@youlearn/types";
import {
	loadPublishedRevisions,
	newMigrationCache,
	type Revision,
} from "./enrollment-migration";
import { revisionsBetween, updateOfferFor } from "./enrollment-rules";

const { enrollment } = schema;

type EnrollmentRow = typeof enrollment.$inferSelect;

/** What an enrollment needs to know to announce a move: its own state and where it points. */
export type ExtrasInput = Pick<
	EnrollmentRow,
	| "id"
	| "courseId"
	| "revisionId"
	| "status"
	| "previousEnrollmentId"
	| "noticeAckedAt"
	| "updatePostponedRevisionId"
>;

/** The parts of a learner's enrollment that depend on the other revisions and enrollments. */
export type EnrollmentExtras = {
	update: UpdateOffer | null;
	notice: EnrollmentNotice | null;
};

export const NO_EXTRAS: EnrollmentExtras = { update: null, notice: null };

/**
 * The offer to move to a newer revision and the notice of a move already made, for several enrollments at once: one
 * read of the revisions of their courses and one of the enrollments they continue, whatever their number.
 */
export async function loadEnrollmentExtras(
	rows: readonly ExtrasInput[],
): Promise<Map<string, EnrollmentExtras>> {
	const extras = new Map<string, EnrollmentExtras>();
	if (rows.length === 0) return extras;

	const cache = newMigrationCache();
	const courseIds = [...new Set(rows.map((row) => row.courseId))];
	await Promise.all(
		courseIds.map((courseId) => loadPublishedRevisions(db, courseId, cache)),
	);

	for (const row of rows) {
		const revisions = cache.revisions.get(row.courseId) ?? [];
		extras.set(row.id, {
			update: updateOfferFor(revisions, row),
			notice: await noticeFor(row, revisions),
		});
	}
	return extras;
}

/**
 * The revision a learner last knew, when minor publications moved them since: the revision of the first enrollment of
 * the run of automatic moves they have not acknowledged. Several publications can have moved them while they were
 * away, each creating an enrollment that continues the previous one, and only the last is looked at.
 */
async function findNoticeOrigin(
	previousEnrollmentId: string,
): Promise<string | undefined> {
	let current = previousEnrollmentId;
	for (let hops = 0; hops < 50; hops++) {
		const [row] = await db
			.select({
				revisionId: enrollment.revisionId,
				previousEnrollmentId: enrollment.previousEnrollmentId,
				noticeAckedAt: enrollment.noticeAckedAt,
			})
			.from(enrollment)
			.where(eq(enrollment.id, current));
		if (!row) return undefined;
		// The first enrollment, or one whose own move the learner acknowledged: that revision is what they knew.
		if (row.previousEnrollmentId === null || row.noticeAckedAt !== null)
			return row.revisionId;
		current = row.previousEnrollmentId;
	}
	return undefined;
}

const toUpdateRevision = (revision: Revision): UpdateRevision => ({
	key: revision.key,
	purpose: revision.purpose,
	impact: revision.changeImpact,
});

async function noticeFor(
	row: ExtrasInput,
	revisions: readonly Revision[],
): Promise<EnrollmentNotice | null> {
	if (
		row.noticeAckedAt !== null ||
		row.previousEnrollmentId === null ||
		row.status === "superseded"
	)
		return null;
	const originId = await findNoticeOrigin(row.previousEnrollmentId);
	const origin = revisions.find((revision) => revision.id === originId);
	const own = revisions.find((revision) => revision.id === row.revisionId);
	if (!origin || !own) return null;
	return {
		fromRevisionKey: origin.key,
		toRevisionKey: own.key,
		revisions: revisionsBetween(revisions, origin.id, own.id).map(
			toUpdateRevision,
		),
	};
}

/**
 * Where a superseded enrollment leads now: the live enrollment at the end of its chain (it may have been moved more
 * than once). Null when it is not superseded or nothing continues it.
 */
export async function findSuccessorId(
	enrollmentId: string,
): Promise<string | null> {
	let current = enrollmentId;
	for (let hops = 0; hops < 20; hops++) {
		const [next] = await db
			.select({ id: enrollment.id })
			.from(enrollment)
			.where(eq(enrollment.previousEnrollmentId, current));
		if (!next) return current === enrollmentId ? null : current;
		current = next.id;
	}
	return current;
}
