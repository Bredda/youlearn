import type { CourseContent } from "@youlearn/content";
import { contentSchema } from "@youlearn/content";
import { describe, expect, it } from "vitest";
import {
	editContent,
	moveItem,
	newChapter,
	newFinalExam,
	newMarkdownBlock,
	newQuestion,
	newVideoBlock,
} from "./content-editor";

const empty: CourseContent = { version: 2, chapters: [] };

const withChapter = (): { content: CourseContent; id: string } => {
	const chapter = newChapter("c1");
	return {
		id: "c1",
		content: editContent(empty, { type: "addChapter", chapter }),
	};
};

describe("moveItem", () => {
	it("moves an item and ignores out of range or no-op moves", () => {
		expect(moveItem(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
		expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
		const same = ["a", "b"];
		expect(moveItem(same, 1, 1)).toBe(same);
		expect(moveItem(same, 0, 5)).toBe(same);
		expect(moveItem(same, -1, 0)).toBe(same);
	});
});

describe("editContent", () => {
	it("adds, renames, moves and removes chapters without touching the others", () => {
		let content = editContent(empty, {
			type: "addChapter",
			chapter: newChapter("a"),
		});
		content = editContent(content, {
			type: "addChapter",
			chapter: newChapter("b"),
		});
		content = editContent(content, {
			type: "renameChapter",
			chapterId: "b",
			title: "Two",
		});
		content = editContent(content, { type: "moveChapter", from: 1, to: 0 });
		expect(content.chapters.map((c) => [c.id, c.title])).toEqual([
			["b", "Two"],
			["a", "Nouveau chapitre"],
		]);
		content = editContent(content, { type: "removeChapter", chapterId: "b" });
		expect(content.chapters.map((c) => c.id)).toEqual(["a"]);
	});

	it("edits a markdown block and a video block with the right fields", () => {
		let { content, id } = withChapter();
		content = editContent(content, {
			type: "addBlock",
			chapterId: id,
			block: newMarkdownBlock("m"),
		});
		content = editContent(content, {
			type: "addBlock",
			chapterId: id,
			block: newVideoBlock("v"),
		});
		content = editContent(content, {
			type: "updateBlock",
			chapterId: id,
			blockId: "m",
			patch: { body: "# Hi", url: "ignored" },
		});
		content = editContent(content, {
			type: "updateBlock",
			chapterId: id,
			blockId: "v",
			patch: {
				url: "https://youtu.be/dQw4w9WgXcQ",
				title: "T",
				body: "ignored",
			},
		});
		expect(content.chapters[0]?.blocks).toEqual([
			{ id: "m", type: "markdown", body: "# Hi" },
			{
				id: "v",
				type: "video",
				url: "https://youtu.be/dQw4w9WgXcQ",
				title: "T",
			},
		]);
		content = editContent(content, {
			type: "moveBlock",
			chapterId: id,
			from: 0,
			to: 1,
		});
		expect(content.chapters[0]?.blocks.map((b) => b.id)).toEqual(["v", "m"]);
		content = editContent(content, {
			type: "removeBlock",
			chapterId: id,
			blockId: "v",
		});
		expect(content.chapters[0]?.blocks.map((b) => b.id)).toEqual(["m"]);
	});

	it("starts a quiz that only needs text to be valid, and drops it entirely", () => {
		let { content, id } = withChapter();
		content = editContent(content, { type: "addQuiz", chapterId: id });
		const quiz = content.chapters[0]?.quiz;
		expect(quiz?.questions).toHaveLength(1);
		expect(quiz?.drawCount).toBe(1);
		expect(quiz?.questions[0]?.options.filter((o) => o.correct)).toHaveLength(
			1,
		);
		expect(contentSchema.safeParse(content).success).toBe(false); // empty prompt and options

		content = editContent(content, { type: "removeQuiz", chapterId: id });
		expect("quiz" in (content.chapters[0] ?? {})).toBe(false);
	});

	it("keeps the draw count within the pool as questions come and go", () => {
		let { content, id } = withChapter();
		content = editContent(content, { type: "addQuiz", chapterId: id });
		content = editContent(content, {
			type: "addQuestion",
			chapterId: id,
			question: newQuestion(),
		});
		content = editContent(content, {
			type: "addQuestion",
			chapterId: id,
			question: newQuestion(),
		});
		content = editContent(content, {
			type: "updateQuiz",
			chapterId: id,
			patch: { drawCount: 3 },
		});
		expect(content.chapters[0]?.quiz?.drawCount).toBe(3);
		// Asking for more than the pool holds is clamped.
		content = editContent(content, {
			type: "updateQuiz",
			chapterId: id,
			patch: { drawCount: 9 },
		});
		expect(content.chapters[0]?.quiz?.drawCount).toBe(3);
		const last = content.chapters[0]?.quiz?.questions[2]?.id ?? "";
		content = editContent(content, {
			type: "removeQuestion",
			chapterId: id,
			questionId: last,
		});
		expect(content.chapters[0]?.quiz?.drawCount).toBe(2);
	});

	it("keeps one correct option on a single choice and several on a multiple choice", () => {
		let { content, id } = withChapter();
		content = editContent(content, { type: "addQuiz", chapterId: id });
		const question = () => content.chapters[0]?.quiz?.questions[0];
		const qid = question()?.id ?? "";
		content = editContent(content, {
			type: "addOption",
			chapterId: id,
			questionId: qid,
		});
		const [a, b, c] = question()?.options.map((o) => o.id) ?? [];
		const correct = () =>
			question()
				?.options.filter((o) => o.correct)
				.map((o) => o.id);

		content = editContent(content, {
			type: "setCorrect",
			chapterId: id,
			questionId: qid,
			optionId: c ?? "",
			correct: true,
		});
		expect(correct()).toEqual([c]);

		content = editContent(content, {
			type: "updateQuestion",
			chapterId: id,
			questionId: qid,
			patch: { type: "multiple" },
		});
		content = editContent(content, {
			type: "setCorrect",
			chapterId: id,
			questionId: qid,
			optionId: a ?? "",
			correct: true,
		});
		expect(correct()).toEqual([a, c]);

		// Back to a single choice: only the first correct option survives.
		content = editContent(content, {
			type: "updateQuestion",
			chapterId: id,
			questionId: qid,
			patch: { type: "single" },
		});
		expect(correct()).toEqual([a]);
		expect(b).toBeDefined();
	});

	it("edits option text and removes an option", () => {
		let { content, id } = withChapter();
		content = editContent(content, { type: "addQuiz", chapterId: id });
		const qid = content.chapters[0]?.quiz?.questions[0]?.id ?? "";
		const oid = content.chapters[0]?.quiz?.questions[0]?.options[1]?.id ?? "";
		content = editContent(content, {
			type: "updateOption",
			chapterId: id,
			questionId: qid,
			optionId: oid,
			text: "Non",
		});
		expect(content.chapters[0]?.quiz?.questions[0]?.options[1]?.text).toBe(
			"Non",
		);
		content = editContent(content, {
			type: "removeOption",
			chapterId: id,
			questionId: qid,
			optionId: oid,
		});
		expect(content.chapters[0]?.quiz?.questions[0]?.options).toHaveLength(1);
	});

	it("produces a valid tree once the author filled in the text", () => {
		let { content, id } = withChapter();
		content = editContent(content, {
			type: "addBlock",
			chapterId: id,
			block: newMarkdownBlock("m"),
		});
		content = editContent(content, { type: "addQuiz", chapterId: id });
		const q = content.chapters[0]?.quiz?.questions[0];
		content = editContent(content, {
			type: "updateQuestion",
			chapterId: id,
			questionId: q?.id ?? "",
			patch: { prompt: "2+2 ?" },
		});
		for (const [i, option] of (q?.options ?? []).entries()) {
			content = editContent(content, {
				type: "updateOption",
				chapterId: id,
				questionId: q?.id ?? "",
				optionId: option.id,
				text: i === 0 ? "4" : "5",
			});
		}
		expect(contentSchema.safeParse(content).success).toBe(true);
	});
});

describe("chapter duration", () => {
	it("sets, replaces and clears the estimate of one chapter", () => {
		let { content, id } = withChapter();
		content = editContent(content, {
			type: "setDuration",
			chapterId: id,
			minutes: 30,
		});
		expect(content.chapters[0]?.estimatedMinutes).toBe(30);
		content = editContent(content, {
			type: "setDuration",
			chapterId: id,
			minutes: 45,
		});
		expect(content.chapters[0]?.estimatedMinutes).toBe(45);
		content = editContent(content, {
			type: "setDuration",
			chapterId: id,
			minutes: undefined,
		});
		expect("estimatedMinutes" in (content.chapters[0] ?? {})).toBe(false);
	});
});

/** Rules about the exam itself; the blank template question is not valid until the author fills it in. */
const examIssues = (content: CourseContent) => {
	const result = contentSchema.safeParse(content);
	return result.success
		? []
		: result.error.issues.filter((i) =>
				/final exam|certifying/.test(i.message),
			);
};

describe("certification", () => {
	const certifying = () => {
		let { content } = withChapter();
		content = editContent(content, {
			type: "setCertifying",
			certifying: true,
			exam: newFinalExam("exam"),
		});
		return content;
	};

	it("adds a valid final exam as last chapter, and drops it when turned off", () => {
		const content = certifying();
		expect(content.certifying).toBe(true);
		expect(content.chapters.map((c) => c.id)).toEqual(["c1", "exam"]);
		expect(examIssues(content)).toEqual([]);

		const off = editContent(content, {
			type: "setCertifying",
			certifying: false,
		});
		expect(off.certifying).toBeUndefined();
		expect(off.chapters.map((c) => c.id)).toEqual(["c1"]);
		expect(contentSchema.safeParse(off).success).toBe(true);
	});

	it("keeps the existing exam when certification is asked twice", () => {
		const content = certifying();
		const again = editContent(content, {
			type: "setCertifying",
			certifying: true,
			exam: newFinalExam("other"),
		});
		expect(again.chapters.map((c) => c.id)).toEqual(["c1", "exam"]);
	});

	it("inserts new chapters before the exam", () => {
		const content = editContent(certifying(), {
			type: "addChapter",
			chapter: newChapter("c2"),
		});
		expect(content.chapters.map((c) => c.id)).toEqual(["c1", "c2", "exam"]);
		expect(examIssues(content)).toEqual([]);
	});

	it("never moves, removes or fills the exam", () => {
		const content = editContent(certifying(), {
			type: "addChapter",
			chapter: newChapter("c2"),
		});
		const ids = (value: CourseContent) => value.chapters.map((c) => c.id);
		expect(
			ids(editContent(content, { type: "moveChapter", from: 2, to: 0 })),
		).toEqual(["c1", "c2", "exam"]);
		expect(
			ids(editContent(content, { type: "moveChapter", from: 0, to: 2 })),
		).toEqual(["c1", "c2", "exam"]);
		expect(
			ids(editContent(content, { type: "moveChapter", from: 0, to: 1 })),
		).toEqual(["c2", "c1", "exam"]);
		expect(
			ids(editContent(content, { type: "removeChapter", chapterId: "exam" })),
		).toEqual(["c1", "c2", "exam"]);
		expect(
			editContent(content, {
				type: "addBlock",
				chapterId: "exam",
				block: newMarkdownBlock("b"),
			}),
		).toBe(content);
		expect(
			editContent(content, { type: "removeQuiz", chapterId: "exam" }),
		).toBe(content);
	});
});
