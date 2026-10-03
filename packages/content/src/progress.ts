import type { Chapter, CourseContent } from "./schema";

export type ChapterState = "locked" | "available" | "completed";

/** What a learner has done: the chapters they finished, and those whose quiz they passed at least once. */
export type Progress = {
	completed: ReadonlySet<string>;
	passedQuizzes: ReadonlySet<string>;
};

const isFinalExam = (chapter: Chapter) => chapter.kind === "final-exam";

/**
 * Where the learner stands in each chapter.
 * - A blocking quiz keeps every chapter after it locked until the quiz is passed.
 * - The final exam stays locked until every other chapter is completed.
 * - Any other chapter is open: a learner may read ahead, only the quizzes gate.
 */
export function chapterStates(
	content: CourseContent,
	{ completed, passedQuizzes }: Progress,
): Record<string, ChapterState> {
	const states: Record<string, ChapterState> = {};
	const othersDone = content.chapters
		.filter((chapter) => !isFinalExam(chapter))
		.every((chapter) => completed.has(chapter.id));
	let gated = false;
	for (const chapter of content.chapters) {
		if (completed.has(chapter.id)) states[chapter.id] = "completed";
		else if (gated || (isFinalExam(chapter) && !othersDone))
			states[chapter.id] = "locked";
		else states[chapter.id] = "available";
		if (chapter.quiz?.blocking && !passedQuizzes.has(chapter.id)) gated = true;
	}
	return states;
}

export type CompleteRefusal =
	| "UNKNOWN_CHAPTER"
	| "LOCKED"
	| "FINAL_EXAM"
	| "QUIZ_NOT_PASSED";

/**
 * Whether the learner may mark a chapter as finished. Finishing again is harmless. The final exam is never
 * finished by hand: passing it does. A blocking quiz must have been passed.
 */
export function canCompleteChapter(
	content: CourseContent,
	chapterId: string,
	progress: Progress,
): { ok: true } | { ok: false; reason: CompleteRefusal } {
	const chapter = content.chapters.find((c) => c.id === chapterId);
	if (!chapter) return { ok: false, reason: "UNKNOWN_CHAPTER" };
	if (isFinalExam(chapter)) return { ok: false, reason: "FINAL_EXAM" };
	if (progress.completed.has(chapterId)) return { ok: true };
	if (chapterStates(content, progress)[chapterId] === "locked")
		return { ok: false, reason: "LOCKED" };
	if (chapter.quiz?.blocking && !progress.passedQuizzes.has(chapterId))
		return { ok: false, reason: "QUIZ_NOT_PASSED" };
	return { ok: true };
}

/**
 * An enrollment is complete once every chapter is: for a certifying course that includes the final exam, which
 * only passing it completes. An empty course never completes.
 */
export function enrollmentOutcome(
	content: CourseContent,
	completed: ReadonlySet<string>,
): "in_progress" | "completed" {
	return content.chapters.length > 0 &&
		content.chapters.every((chapter) => completed.has(chapter.id))
		? "completed"
		: "in_progress";
}
