import type { CourseContent, ReviewTarget } from "@youlearn/types";
import { describe, expect, it } from "vitest";
import { describeTarget, sameTarget, targetChapterId } from "./review-targets";

const content: CourseContent = {
	version: 2,
	chapters: [
		{ id: "c1", title: "Intro", blocks: [] },
		{
			id: "c2",
			title: "Suite",
			blocks: [
				{ id: "b1", type: "markdown", body: "" },
				{ id: "b2", type: "video", url: "https://youtu.be/x", title: "V" },
			],
			quiz: {
				blocking: false,
				passRate: 70,
				drawCount: 1,
				questions: [
					{
						id: "q1",
						type: "single",
						prompt: "?",
						options: [
							{ id: "a", text: "a", correct: true },
							{ id: "b", text: "b", correct: false },
						],
					},
				],
			},
		},
	],
};

describe("sameTarget", () => {
	it("compares type and ids", () => {
		const block: ReviewTarget = {
			type: "block",
			chapterId: "c1",
			itemId: "b1",
		};
		expect(sameTarget(block, { ...block })).toBe(true);
		expect(sameTarget(block, { ...block, itemId: "b2" })).toBe(false);
		expect(sameTarget(block, { type: "chapter", chapterId: "c1" })).toBe(false);
		expect(sameTarget({ type: "revision" }, { type: "revision" })).toBe(true);
	});

	it("does not mix a block and a question that share an id", () => {
		expect(
			sameTarget(
				{ type: "block", chapterId: "c1", itemId: "x" },
				{ type: "question", chapterId: "c1", itemId: "x" },
			),
		).toBe(false);
	});
});

describe("targetChapterId", () => {
	it("is the chapter of the element, none for the revision", () => {
		expect(targetChapterId({ type: "revision" })).toBeUndefined();
		expect(
			targetChapterId({ type: "question", chapterId: "c2", itemId: "q" }),
		).toBe("c2");
	});
});

describe("describeTarget", () => {
	it("says where the element is", () => {
		expect(describeTarget(content, { type: "revision" })).toBe(
			"Révision entière",
		);
		expect(describeTarget(content, { type: "chapter", chapterId: "c2" })).toBe(
			"Chapitre 2 · Suite",
		);
		expect(
			describeTarget(content, { type: "block", chapterId: "c2", itemId: "b2" }),
		).toBe("Chapitre 2 · Suite · Bloc 2 (vidéo)");
		expect(
			describeTarget(content, {
				type: "question",
				chapterId: "c2",
				itemId: "q1",
			}),
		).toBe("Chapitre 2 · Suite · Question 1");
	});

	it("names what was deleted", () => {
		expect(
			describeTarget(content, { type: "chapter", chapterId: "gone" }),
		).toBe("Élément supprimé");
		expect(
			describeTarget(content, {
				type: "block",
				chapterId: "c1",
				itemId: "gone",
			}),
		).toBe("Chapitre 1 · Intro · Bloc supprimé");
	});
});
