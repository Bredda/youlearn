import { db, eq, inArray, schema } from "@youlearn/db";
import type { EnrollmentNotice, UpdateOffer } from "@youlearn/types";
import {
	loadPublishedRevisions,
	newMigrationCache,
} from "./enrollment-migration";
import { updateOfferFor } from "./enrollment-rules";

const { courseRevision, enrollment } = schema;

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

	// A notice names the revision the learner was moved from: the one of the enrollment this one continues.
	const noticed = rows.filter(
		(row) =>
			row.noticeAckedAt === null &&
			row.previousEnrollmentId !== null &&
			row.status !== "superseded",
	);
	const previous = noticed.length
		? await db
				.select({ id: enrollment.id, revisionKey: courseRevision.key })
				.from(enrollment)
				.innerJoin(courseRevision, eq(courseRevision.id, enrollment.revisionId))
				.where(
					inArray(
						enrollment.id,
						noticed.flatMap((row) =>
							row.previousEnrollmentId ? [row.previousEnrollmentId] : [],
						),
					),
				)
		: [];
	const previousKey = new Map(previous.map((row) => [row.id, row.revisionKey]));

	for (const row of rows) {
		const revisions = cache.revisions.get(row.courseId) ?? [];
		const own = revisions.find((revision) => revision.id === row.revisionId);
		const fromKey = row.previousEnrollmentId
			? previousKey.get(row.previousEnrollmentId)
			: undefined;
		extras.set(row.id, {
			update: updateOfferFor(revisions, row),
			notice:
				row.noticeAckedAt === null &&
				own &&
				fromKey !== undefined &&
				row.status !== "superseded"
					? {
							fromRevisionKey: fromKey,
							toRevisionKey: own.key,
							purpose: own.purpose,
						}
					: null,
		});
	}
	return extras;
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
