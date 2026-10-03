import { diffLines, diffWordsWithSpace } from "diff";
import type {
	Block,
	Chapter,
	CourseContent,
	Question,
	QuestionOption,
	Quiz,
} from "./schema";

export type ChangeStatus = "added" | "removed" | "modified" | "unchanged";

/** `moved` is orthogonal to `status`: an item can be moved and modified. It means its order among the items present on both sides changed. */
type Matched = { status: ChangeStatus; moved: boolean };

export type LineChange = {
	kind: "equal" | "added" | "removed";
	/** The lines, newline included. */
	text: string;
	/** How many lines `text` holds. */
	count: number;
};

export type InlineChange = {
	kind: "equal" | "added" | "removed";
	text: string;
};

export type DiffStats = {
	linesAdded: number;
	linesRemoved: number;
	/** Items that differ: chapter titles, blocks, quiz settings, questions, options. */
	changes: number;
};

export type BlockDiff = Matched & {
	id: string;
	before: Block | null;
	after: Block | null;
	/** Line changes of the markdown involved (empty for a video on both sides). */
	lines: LineChange[];
};

export type OptionDiff = Matched & {
	id: string;
	before: QuestionOption | null;
	after: QuestionOption | null;
	/** The option kept its id but is now (in)correct: the change that matters most to a reviewer. */
	correctChanged: boolean;
};

export type QuestionDiff = Matched & {
	id: string;
	before: Question | null;
	after: Question | null;
	typeChanged: boolean;
	promptLines: LineChange[];
	explanationLines: LineChange[];
	options: OptionDiff[];
};

export type QuizSetting = "blocking" | "passRate" | "drawCount";

export type QuizDiff = {
	status: ChangeStatus;
	before: Quiz | null;
	after: Quiz | null;
	settingsChanged: QuizSetting[];
	questions: QuestionDiff[];
};

export type ChapterDiff = Matched & {
	id: string;
	before: Chapter | null;
	after: Chapter | null;
	titleChanged: boolean;
	/** The estimated duration was set, changed or cleared on a chapter present on both sides. */
	durationChanged: boolean;
	blocks: BlockDiff[];
	quiz: QuizDiff | null;
	stats: DiffStats;
};

export type ContentDiff = {
	changed: boolean;
	/** The course became (or stopped being) certifying. */
	certifyingChanged: boolean;
	chapters: ChapterDiff[];
	stats: DiffStats;
};

export function deepEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
	if (Array.isArray(a) || Array.isArray(b)) {
		return (
			Array.isArray(a) &&
			Array.isArray(b) &&
			a.length === b.length &&
			a.every((value, i) => deepEqual(value, b[i]))
		);
	}
	// jsonb does not keep key order and drops nothing but `undefined`: compare as sets of defined keys.
	const left = a as Record<string, unknown>;
	const right = b as Record<string, unknown>;
	const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
	for (const key of keys) {
		if (!deepEqual(left[key], right[key])) return false;
	}
	return true;
}

/** Indexes (into `sequence`) of one longest strictly increasing subsequence. */
function longestIncreasing(sequence: number[]): Set<number> {
	const length = new Array<number>(sequence.length).fill(1);
	const previous = new Array<number>(sequence.length).fill(-1);
	let best = -1;
	for (let i = 0; i < sequence.length; i++) {
		for (let j = 0; j < i; j++) {
			if (
				(sequence[j] ?? 0) < (sequence[i] ?? 0) &&
				(length[j] ?? 0) + 1 > (length[i] ?? 0)
			) {
				length[i] = (length[j] ?? 0) + 1;
				previous[i] = j;
			}
		}
		if (best === -1 || (length[i] ?? 0) > (length[best] ?? 0)) best = i;
	}
	const kept = new Set<number>();
	for (let i = best; i !== -1; i = previous[i] ?? -1) kept.add(i);
	return kept;
}

type Pair<T> = {
	id: string;
	before: T | null;
	after: T | null;
	moved: boolean;
};

/**
 * Pairs two ordered lists by id. The result follows the order of `to`; removed items sit right after the item
 * that preceded them in `from`.
 */
export function pairById<T extends { id: string }>(
	from: readonly T[],
	to: readonly T[],
): Pair<T>[] {
	const fromById = new Map(from.map((item) => [item.id, item]));
	const toIds = new Set(to.map((item) => item.id));

	const common = from.filter((item) => toIds.has(item.id));
	const toIndex = new Map(to.map((item, index) => [item.id, index]));
	const kept = longestIncreasing(
		common.map((item) => toIndex.get(item.id) ?? 0),
	);
	const stays = new Set(
		common.filter((_, i) => kept.has(i)).map((item) => item.id),
	);

	// Removed items, grouped under the nearest preceding common item ("" = the start).
	const removedAfter = new Map<string, T[]>();
	let anchor = "";
	for (const item of from) {
		if (toIds.has(item.id)) {
			anchor = item.id;
		} else {
			removedAfter.set(anchor, [...(removedAfter.get(anchor) ?? []), item]);
		}
	}
	const removedPairs = (key: string): Pair<T>[] =>
		(removedAfter.get(key) ?? []).map((item) => ({
			id: item.id,
			before: item,
			after: null,
			moved: false,
		}));

	const result = removedPairs("");
	for (const item of to) {
		const before = fromById.get(item.id) ?? null;
		result.push({
			id: item.id,
			before,
			after: item,
			moved: before !== null && !stays.has(item.id),
		});
		result.push(...removedPairs(item.id));
	}
	return result;
}

function toLineChanges(before: string, after: string): LineChange[] {
	return diffLines(before, after, { ignoreNewlineAtEof: true }).map((part) => ({
		kind: part.added ? "added" : part.removed ? "removed" : "equal",
		text: part.value,
		count: part.count ?? 0,
	}));
}

/** Word level changes of two texts, to highlight what changed inside a modified line. */
export function diffInline(before: string, after: string): InlineChange[] {
	return diffWordsWithSpace(before, after).map((part) => ({
		kind: part.added ? "added" : part.removed ? "removed" : "equal",
		text: part.value,
	}));
}

const countLines = (lines: LineChange[], kind: LineChange["kind"]) =>
	lines.reduce((sum, line) => sum + (line.kind === kind ? line.count : 0), 0);

const noStats = (): DiffStats => ({
	linesAdded: 0,
	linesRemoved: 0,
	changes: 0,
});

function addStats(into: DiffStats, other: DiffStats) {
	into.linesAdded += other.linesAdded;
	into.linesRemoved += other.linesRemoved;
	into.changes += other.changes;
}

const statusOf = (
	before: unknown,
	after: unknown,
	modified: boolean,
): ChangeStatus =>
	before === null
		? "added"
		: after === null
			? "removed"
			: modified
				? "modified"
				: "unchanged";

const bodyOf = (block: Block | null) =>
	block?.type === "markdown" ? block.body : "";

function diffBlock(pair: Pair<Block>): BlockDiff {
	const { before, after } = pair;
	const modified = !deepEqual(before, after);
	const involvesMarkdown =
		before?.type === "markdown" || after?.type === "markdown";
	return {
		id: pair.id,
		before,
		after,
		moved: pair.moved,
		status: statusOf(before, after, modified),
		lines: involvesMarkdown ? toLineChanges(bodyOf(before), bodyOf(after)) : [],
	};
}

function diffOption(pair: Pair<QuestionOption>): OptionDiff {
	const { before, after } = pair;
	return {
		id: pair.id,
		before,
		after,
		moved: pair.moved,
		status: statusOf(before, after, !deepEqual(before, after)),
		correctChanged:
			before !== null && after !== null && before.correct !== after.correct,
	};
}

function diffQuestion(pair: Pair<Question>): QuestionDiff {
	const { before, after } = pair;
	const options = pairById(before?.options ?? [], after?.options ?? []).map(
		diffOption,
	);
	const modified =
		!deepEqual(
			before && { ...before, options: undefined },
			after && { ...after, options: undefined },
		) || options.some((o) => o.status !== "unchanged" || o.moved);
	return {
		id: pair.id,
		before,
		after,
		moved: pair.moved,
		status: statusOf(before, after, modified),
		typeChanged:
			before !== null && after !== null && before.type !== after.type,
		promptLines: toLineChanges(before?.prompt ?? "", after?.prompt ?? ""),
		explanationLines: toLineChanges(
			before?.explanation ?? "",
			after?.explanation ?? "",
		),
		options,
	};
}

const SETTINGS: QuizSetting[] = ["blocking", "passRate", "drawCount"];

function diffQuiz(before: Quiz | null, after: Quiz | null): QuizDiff | null {
	if (!before && !after) return null;
	const questions = pairById(
		before?.questions ?? [],
		after?.questions ?? [],
	).map(diffQuestion);
	const settingsChanged =
		before && after ? SETTINGS.filter((key) => before[key] !== after[key]) : [];
	const modified =
		settingsChanged.length > 0 ||
		questions.some((q) => q.status !== "unchanged" || q.moved);
	return {
		status: statusOf(before, after, modified),
		before,
		after,
		settingsChanged,
		questions,
	};
}

function quizStats(quiz: QuizDiff | null): DiffStats {
	const stats = noStats();
	if (!quiz || quiz.status === "unchanged") return stats;
	stats.changes +=
		quiz.settingsChanged.length || (quiz.before && quiz.after ? 0 : 1);
	for (const question of quiz.questions) {
		if (question.status === "unchanged" && !question.moved) continue;
		stats.changes += 1;
		stats.linesAdded += countLines(question.promptLines, "added");
		stats.linesRemoved += countLines(question.promptLines, "removed");
	}
	return stats;
}

function diffChapter(pair: Pair<Chapter>): ChapterDiff {
	const { before, after } = pair;
	const blocks = pairById(before?.blocks ?? [], after?.blocks ?? []).map(
		diffBlock,
	);
	const quiz = diffQuiz(before?.quiz ?? null, after?.quiz ?? null);
	const titleChanged =
		before !== null && after !== null && before.title !== after.title;

	const stats = noStats();
	for (const block of blocks) {
		if (block.status === "unchanged" && !block.moved) continue;
		stats.changes += 1;
		stats.linesAdded += countLines(block.lines, "added");
		stats.linesRemoved += countLines(block.lines, "removed");
	}
	addStats(stats, quizStats(quiz));
	if (titleChanged) stats.changes += 1;
	const durationChanged =
		before !== null &&
		after !== null &&
		before.estimatedMinutes !== after.estimatedMinutes;
	if (durationChanged) stats.changes += 1;

	const modified =
		titleChanged ||
		durationChanged ||
		blocks.some((b) => b.status !== "unchanged" || b.moved) ||
		(quiz !== null && quiz.status !== "unchanged");

	return {
		id: pair.id,
		before,
		after,
		moved: pair.moved,
		status: statusOf(before, after, modified),
		titleChanged,
		durationChanged,
		blocks,
		quiz,
		stats,
	};
}

/** Chapter by chapter difference of two revisions, items paired by id. `from` is the base, `to` the newer side. */
export function diffContent(
	from: CourseContent,
	to: CourseContent,
): ContentDiff {
	const chapters = pairById(from.chapters, to.chapters).map(diffChapter);
	const stats = noStats();
	for (const chapter of chapters) {
		addStats(stats, chapter.stats);
		if (chapter.moved) stats.changes += 1;
	}
	const certifyingChanged =
		(from.certifying ?? false) !== (to.certifying ?? false);
	if (certifyingChanged) stats.changes += 1;
	return {
		changed:
			certifyingChanged ||
			chapters.some((c) => c.status !== "unchanged" || c.moved),
		certifyingChanged,
		chapters,
		stats,
	};
}
