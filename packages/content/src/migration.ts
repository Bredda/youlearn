import { type ChapterDiff, type ContentDiff, deepEqual } from "./diff";
import type { Chapter } from "./schema";

/**
 * How much a publication matters to the learners already on the previous revision, declared by the writer: `minor`
 * (a correction, nothing to redo) or `major` (content or quizzes changed, what changed has to be redone).
 */
export type ChangeImpact = "minor" | "major";

/** What becomes of a chapter when a learner moves from a revision to a newer one. */
export type ChapterImpact = "kept" | "redo" | "added" | "removed";

/** A chapter as a learner sees it in the update offer: no block, question, option nor explanation. */
export type UpdateChapter = {
	id: string;
	title: string;
	impact: ChapterImpact;
};

export type UpdateSummary = {
	level: ChangeImpact;
	chapters: UpdateChapter[];
};

const kindOf = (chapter: Chapter | null) => chapter?.kind ?? "standard";

/**
 * Whether a chapter present on both sides changed in a way that matters to someone who already did it: a block was
 * added, removed or edited, the quiz changed (settings, questions, options, correct answers, explanations), or the
 * chapter became (or stopped being) the final exam. A title, a duration or an order alone does not count, and
 * neither does the order of the questions or of the options.
 */
function mustRedo(chapter: ChapterDiff): boolean {
	if (kindOf(chapter.before) !== kindOf(chapter.after)) return true;
	if (chapter.blocks.some((block) => block.status !== "unchanged")) return true;
	const quiz = chapter.quiz;
	if (!quiz) return false;
	if (quiz.status === "added" || quiz.status === "removed") return true;
	if (quiz.settingsChanged.length > 0) return true;
	return quiz.questions.some(
		(question) =>
			question.status === "added" ||
			question.status === "removed" ||
			question.options.some((option) => option.status !== "unchanged") ||
			!deepEqual(
				question.before && { ...question.before, options: undefined },
				question.after && { ...question.after, options: undefined },
			),
	);
}

/** The impact of each chapter of the diff, in the order of the newer revision (removed ones after their predecessor). */
export function chapterImpacts(diff: ContentDiff): Map<string, ChapterImpact> {
	const impacts = new Map<string, ChapterImpact>();
	for (const chapter of diff.chapters) {
		impacts.set(
			chapter.id,
			chapter.before === null
				? "added"
				: chapter.after === null
					? "removed"
					: mustRedo(chapter)
						? "redo"
						: "kept",
		);
	}
	return impacts;
}

/**
 * What a learner is offered for a move between two revisions. A `minor` publication redoes nothing: a chapter that
 * changed keeps its progress, only new chapters are left to do. A `major` one sends back the chapters that changed.
 * The result carries titles and impacts only, never the diff, which holds the correct answers.
 */
export function updateSummary(
	diff: ContentDiff,
	level: ChangeImpact,
): UpdateSummary {
	const impacts = chapterImpacts(diff);
	return {
		level,
		chapters: diff.chapters.map((chapter) => {
			const impact = impacts.get(chapter.id) ?? "kept";
			return {
				id: chapter.id,
				// A removed chapter only exists on the older side.
				title: (chapter.after ?? chapter.before)?.title ?? "",
				impact: level === "minor" && impact === "redo" ? "kept" : impact,
			};
		}),
	};
}

export function countImpacts(
	summary: UpdateSummary,
): Record<ChapterImpact, number> {
	const counts: Record<ChapterImpact, number> = {
		kept: 0,
		redo: 0,
		added: 0,
		removed: 0,
	};
	for (const chapter of summary.chapters) counts[chapter.impact] += 1;
	return counts;
}

/**
 * The progress a learner takes along: finished chapters and passed quizzes, only for the chapters the summary keeps.
 * Anything else (redone, removed, unknown to the diff) starts again or disappears.
 */
export function carryOver(
	summary: UpdateSummary,
	progress: {
		completed: Iterable<string>;
		passedQuizzes: Iterable<string>;
	},
): { completed: string[]; passedQuizzes: string[] } {
	const kept = new Set(
		summary.chapters
			.filter((chapter) => chapter.impact === "kept")
			.map((chapter) => chapter.id),
	);
	return {
		completed: [...progress.completed].filter((id) => kept.has(id)),
		passedQuizzes: [...progress.passedQuizzes].filter((id) => kept.has(id)),
	};
}

/**
 * The level of the move from a learner's revision to the one published now, from the impacts declared by every
 * revision published since theirs (`null` when a revision was published without one, which counts as `major`: nothing
 * says it is safe). `null` when there is no newer revision.
 */
export function combinedImpact(
	impacts: readonly (ChangeImpact | null)[],
): ChangeImpact | null {
	if (impacts.length === 0) return null;
	return impacts.every((impact) => impact === "minor") ? "minor" : "major";
}

/** An enrollment moves by itself only when every revision published since its own was minor. */
export function canAutoMigrate(
	impacts: readonly (ChangeImpact | null)[],
): boolean {
	return combinedImpact(impacts) === "minor";
}
