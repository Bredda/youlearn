import { and, db, eq, isNull, lt, schema, sql } from "@youlearn/db";
import { recordEvent } from "@youlearn/events/server";
import { moveToDeprecated } from "@youlearn/storage";
import { assetKey } from "./assets";

const { course, courseAsset, courseRevision } = schema;

/**
 * A fresh upload may not be referenced yet: the editor inserts the image before the lesson is saved, the cover
 * is attached when the form is submitted. Files younger than this are never swept.
 */
export const ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;
const SWEEP_EVERY_MS = 6 * 60 * 60 * 1000;

/**
 * Not used by any revision (whatever its status: deprecated ones are history and keep their files) and not the
 * cover of the course. Archived courses are left alone: they may come back, and their published revisions are
 * what learners did.
 */
const unreferenced = sql`
	not exists (
		select 1 from ${courseRevision}
		where ${courseRevision.courseId} = ${courseAsset.courseId}
			and ${courseRevision.content}::text like '%asset:' || ${courseAsset.id} || '%'
	)
	and ${course.imageAssetId} is distinct from ${courseAsset.id}`;

const candidates = (olderThanMs: number, courseId?: string) =>
	db
		.select({
			id: courseAsset.id,
			courseId: courseAsset.courseId,
			sha256: courseAsset.sha256,
			filename: courseAsset.filename,
		})
		.from(courseAsset)
		.innerJoin(course, eq(course.id, courseAsset.courseId))
		.where(
			and(
				isNull(course.deletedAt),
				lt(courseAsset.createdAt, new Date(Date.now() - olderThanMs)),
				courseId ? eq(courseAsset.courseId, courseId) : undefined,
				unreferenced,
			),
		);

type Logger = {
	info: (message: string) => void;
	error: (error: unknown, message: string) => void;
};

/**
 * Moves the files nobody uses anymore to the deprecated bucket and forgets their records. The row goes first,
 * after a re-check under a row lock: if the move then fails the blob just stays where it was, nothing is lost.
 * Returns how many files were put aside.
 */
export async function sweepOrphanAssets(
	logger: Logger,
	{
		olderThanMs = ORPHAN_GRACE_MS,
		courseId,
	}: { olderThanMs?: number; courseId?: string } = {},
) {
	let moved = 0;
	for (const candidate of await candidates(olderThanMs, courseId)) {
		const removed = await db.transaction(async (tx) => {
			const [still] = await tx
				.select({ id: courseAsset.id })
				.from(courseAsset)
				.innerJoin(course, eq(course.id, courseAsset.courseId))
				.where(
					and(
						eq(courseAsset.id, candidate.id),
						isNull(course.deletedAt),
						unreferenced,
					),
				)
				.for("update", { of: courseAsset });
			if (!still) return false;
			await tx.delete(courseAsset).where(eq(courseAsset.id, candidate.id));
			return true;
		});
		if (!removed) continue;

		try {
			await moveToDeprecated(assetKey(candidate.courseId, candidate.sha256));
		} catch (error) {
			logger.error(
				error,
				`Could not move file ${candidate.id} to the deprecated bucket`,
			);
		}
		await recordEvent(
			{
				type: "asset.deprecate",
				target: {
					type: "asset",
					id: candidate.id,
					label: candidate.filename,
				},
				metadata: { courseId: candidate.courseId, reason: "unreferenced" },
			},
			logger,
		);
		moved++;
	}
	if (moved > 0)
		logger.info(`Moved ${moved} unused file(s) to the deprecated bucket`);
	return moved;
}

/** Runs the sweep now and then every few hours; returns a function that stops it. */
export function startAssetSweeper(logger: Logger) {
	let running = false;
	const run = async () => {
		if (running) return;
		running = true;
		try {
			await sweepOrphanAssets(logger);
		} catch (error) {
			logger.error(error, "Asset sweep failed");
		} finally {
			running = false;
		}
	};
	void run();
	const timer = setInterval(run, SWEEP_EVERY_MS);
	// Never keep the process alive just for the sweep.
	timer.unref();
	return () => clearInterval(timer);
}
