import { describe, expect, it } from "vitest";
import { diffContent } from "./diff";
import {
	chapter,
	content,
	finalExam,
	md,
	question,
	quiz,
	video,
} from "./fixtures";
import {
	canAutoMigrate,
	carryOver,
	chapterImpacts,
	combinedImpact,
	countImpacts,
	updateSummary,
} from "./migration";
import type { Chapter, CourseContent } from "./schema";

const impactsOf = (from: CourseContent, to: CourseContent) =>
	Object.fromEntries(chapterImpacts(diffContent(from, to)));

/** One chapter changed by `edit`, everything else equal. */
const withChapter = (edit: (c: Chapter) => Chapter) => {
	const base = chapter(
		"c1",
		[md("b1", "text"), video("b2")],
		quiz([question("q1")]),
	);
	return [
		content(base, chapter("c2")),
		content(edit(base), chapter("c2")),
	] as const;
};

describe("chapterImpacts", () => {
	it("keeps identical chapters", () => {
		const [from] = withChapter((c) => c);
		expect(impactsOf(from, from)).toEqual({ c1: "kept", c2: "kept" });
	});

	it("keeps a chapter whose only change is its title, its duration or its place", () => {
		const [from, to] = withChapter((c) => ({
			...c,
			title: "Renamed",
			estimatedMinutes: 30,
		}));
		expect(impactsOf(from, to)).toEqual({ c1: "kept", c2: "kept" });

		const reordered = content(chapter("c2"), from.chapters[0] as Chapter);
		expect(impactsOf(from, reordered)).toEqual({ c1: "kept", c2: "kept" });
	});

	it("redoes a chapter whose block was edited, added or removed", () => {
		const [from, edited] = withChapter((c) => ({
			...c,
			blocks: [md("b1", "other text"), ...c.blocks.slice(1)],
		}));
		expect(impactsOf(from, edited).c1).toBe("redo");

		const [, added] = withChapter((c) => ({
			...c,
			blocks: [...c.blocks, md("b3")],
		}));
		expect(impactsOf(from, added).c1).toBe("redo");

		const [, removed] = withChapter((c) => ({
			...c,
			blocks: c.blocks.slice(1),
		}));
		expect(impactsOf(from, removed).c1).toBe("redo");
	});

	it("keeps a chapter whose blocks only changed order", () => {
		const [from, to] = withChapter((c) => ({
			...c,
			blocks: [...c.blocks].reverse(),
		}));
		expect(impactsOf(from, to).c1).toBe("kept");
	});

	it("redoes a chapter whose quiz changed", () => {
		const [from, setting] = withChapter((c) => ({
			...c,
			quiz: c.quiz && { ...c.quiz, passRate: 90 },
		}));
		expect(impactsOf(from, setting).c1).toBe("redo");

		const [, flipped] = withChapter((c) => ({
			...c,
			quiz: c.quiz && {
				...c.quiz,
				questions: [question("q1", "b")],
			},
		}));
		expect(impactsOf(from, flipped).c1).toBe("redo");

		const [, newQuestion] = withChapter((c) => ({
			...c,
			quiz: c.quiz && {
				...c.quiz,
				questions: [...c.quiz.questions, question("q2")],
			},
		}));
		expect(impactsOf(from, newQuestion).c1).toBe("redo");

		const [, explained] = withChapter((c) => ({
			...c,
			quiz: c.quiz && {
				...c.quiz,
				questions: c.quiz.questions.map((q) => ({
					...q,
					explanation: "Because.",
				})),
			},
		}));
		expect(impactsOf(from, explained).c1).toBe("redo");

		const [, noQuiz] = withChapter((c) => ({ ...c, quiz: undefined }));
		expect(impactsOf(from, noQuiz).c1).toBe("redo");
	});

	it("keeps a chapter whose questions or options only changed order", () => {
		const two = chapter(
			"c1",
			[md("b1")],
			quiz([question("q1"), question("q2")]),
		);
		const reorderedQuestions: Chapter = {
			...two,
			quiz: two.quiz && {
				...two.quiz,
				questions: [...two.quiz.questions].reverse(),
			},
		};
		expect(impactsOf(content(two), content(reorderedQuestions)).c1).toBe(
			"kept",
		);

		const reorderedOptions: Chapter = {
			...two,
			quiz: two.quiz && {
				...two.quiz,
				questions: two.quiz.questions.map((q) => ({
					...q,
					options: [...q.options].reverse(),
				})),
			},
		};
		expect(impactsOf(content(two), content(reorderedOptions)).c1).toBe("kept");
	});

	it("flags added and removed chapters", () => {
		const from = content(chapter("c1"), chapter("c2"));
		const to = content(chapter("c1"), chapter("c3"));
		expect(impactsOf(from, to)).toEqual({
			c1: "kept",
			c2: "removed",
			c3: "added",
		});
	});

	it("treats the final exam like any quiz chapter", () => {
		const from = content(chapter("c1"), finalExam());
		const exam = finalExam();
		const changed = {
			...exam,
			quiz: exam.quiz && {
				...exam.quiz,
				questions: [question("exam-q1", "b")],
			},
		};
		expect(impactsOf(from, content(chapter("c1"), changed)).exam).toBe("redo");
		expect(impactsOf(from, from).exam).toBe("kept");
	});

	it("redoes a chapter that became or stopped being the final exam", () => {
		const standard = chapter("exam", [], quiz([question("exam-q1")]));
		const promoted: Chapter = { ...standard, kind: "final-exam" };
		expect(impactsOf(content(standard), content(promoted)).exam).toBe("redo");
	});
});

describe("updateSummary", () => {
	const from = content(
		chapter("c1", [md("b1", "a")]),
		chapter("c2", [md("b2", "a")]),
		chapter("c3", [md("b3", "a")]),
	);
	const to = content(
		chapter("c1", [md("b1", "a")]),
		chapter("c2", [md("b2", "changed")]),
		chapter("c4", [md("b4", "new")]),
	);
	const diff = diffContent(from, to);

	it("sends back what changed on a major update", () => {
		const summary = updateSummary(diff, "major");
		expect(summary.level).toBe("major");
		expect(summary.chapters.map((c) => [c.id, c.impact])).toEqual([
			["c1", "kept"],
			["c2", "redo"],
			["c3", "removed"],
			["c4", "added"],
		]);
		expect(countImpacts(summary)).toEqual({
			kept: 1,
			redo: 1,
			added: 1,
			removed: 1,
		});
	});

	it("redoes nothing on a minor update", () => {
		const summary = updateSummary(diff, "minor");
		expect(summary.chapters.find((c) => c.id === "c2")?.impact).toBe("kept");
		expect(countImpacts(summary).redo).toBe(0);
		expect(summary.chapters.find((c) => c.id === "c4")?.impact).toBe("added");
	});

	it("carries the titles, the removed one included", () => {
		expect(updateSummary(diff, "major").chapters.map((c) => c.title)).toEqual([
			"Chapter c1",
			"Chapter c2",
			"Chapter c3",
			"Chapter c4",
		]);
	});

	it("never carries a block, a question, an option or an explanation", () => {
		const secret = chapter(
			"c1",
			[md("b1", "SECRET-BLOCK-TEXT")],
			quiz([
				{
					...question("q1"),
					prompt: "SECRET-PROMPT",
					explanation: "SECRET-EXPLANATION",
				},
			]),
		);
		const changed = {
			...secret,
			blocks: [md("b1", "SECRET-BLOCK-TEXT-2")],
			quiz: secret.quiz && {
				...secret.quiz,
				questions: [question("q1", "b")],
			},
		};
		const json = JSON.stringify(
			updateSummary(diffContent(content(secret), content(changed)), "major"),
		);
		expect(json).not.toContain("SECRET");
		expect(json).not.toContain("correct");
		expect(json).not.toContain("options");
		expect(Object.keys(JSON.parse(json).chapters[0]).sort()).toEqual([
			"id",
			"impact",
			"title",
		]);
	});
});

describe("carryOver", () => {
	const summary = updateSummary(
		diffContent(
			content(chapter("c1"), chapter("c2", [md("b", "a")]), chapter("c3")),
			content(chapter("c1"), chapter("c2", [md("b", "b")]), chapter("c4")),
		),
		"major",
	);

	it("keeps the progress of the chapters that are kept only", () => {
		expect(
			carryOver(summary, {
				completed: ["c1", "c2", "c3"],
				passedQuizzes: new Set(["c1", "c2", "c3"]),
			}),
		).toEqual({ completed: ["c1"], passedQuizzes: ["c1"] });
	});

	it("drops what the diff does not know", () => {
		expect(
			carryOver(summary, { completed: ["unknown"], passedQuizzes: [] }),
		).toEqual({ completed: [], passedQuizzes: [] });
	});

	it("carries a passed quiz of a chapter that was not finished", () => {
		expect(
			carryOver(summary, { completed: [], passedQuizzes: ["c1"] }),
		).toEqual({ completed: [], passedQuizzes: ["c1"] });
	});

	it("keeps everything that was done on a minor update", () => {
		const minor = updateSummary(
			diffContent(
				content(chapter("c2", [md("b", "a")])),
				content(chapter("c2", [md("b", "b")])),
			),
			"minor",
		);
		expect(
			carryOver(minor, { completed: ["c2"], passedQuizzes: ["c2"] }),
		).toEqual({ completed: ["c2"], passedQuizzes: ["c2"] });
	});
});

describe("combinedImpact and canAutoMigrate", () => {
	it("is null when no revision was published since", () => {
		expect(combinedImpact([])).toBeNull();
		expect(canAutoMigrate([])).toBe(false);
	});

	it("is minor only when every revision since was minor", () => {
		expect(combinedImpact(["minor"])).toBe("minor");
		expect(combinedImpact(["minor", "minor"])).toBe("minor");
		expect(canAutoMigrate(["minor", "minor"])).toBe(true);
	});

	it("stays major once a revision in between was major, even if the last one is minor", () => {
		expect(combinedImpact(["major", "minor"])).toBe("major");
		expect(canAutoMigrate(["major", "minor"])).toBe(false);
	});

	it("counts a revision published without an impact as major", () => {
		expect(combinedImpact([null])).toBe("major");
		expect(canAutoMigrate(["minor", null])).toBe(false);
	});
});
