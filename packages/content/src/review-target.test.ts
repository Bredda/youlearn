import { describe, expect, it } from "vitest";
import { chapter, content, md, question, quiz } from "./fixtures";
import { reviewTargetExists, reviewTargetSchema } from "./review-target";

const course = content(
	chapter("c1", [md("b1"), md("b2")], quiz([question("q1")])),
	chapter("c2"),
);

describe("reviewTargetExists", () => {
	it("always finds the revision itself", () => {
		expect(reviewTargetExists(content(), { type: "revision" })).toBe(true);
	});

	it("finds chapters, blocks and questions by their ids", () => {
		expect(
			reviewTargetExists(course, { type: "chapter", chapterId: "c2" }),
		).toBe(true);
		expect(
			reviewTargetExists(course, {
				type: "block",
				chapterId: "c1",
				itemId: "b2",
			}),
		).toBe(true);
		expect(
			reviewTargetExists(course, {
				type: "question",
				chapterId: "c1",
				itemId: "q1",
			}),
		).toBe(true);
	});

	it("reports what was deleted", () => {
		expect(
			reviewTargetExists(course, { type: "chapter", chapterId: "x" }),
		).toBe(false);
		expect(
			reviewTargetExists(course, {
				type: "block",
				chapterId: "c1",
				itemId: "nope",
			}),
		).toBe(false);
		expect(
			reviewTargetExists(course, {
				type: "question",
				chapterId: "c2",
				itemId: "q1",
			}),
		).toBe(false);
	});

	it("does not mix up a block and a question with the same id", () => {
		expect(
			reviewTargetExists(course, {
				type: "question",
				chapterId: "c1",
				itemId: "b1",
			}),
		).toBe(false);
	});
});

describe("reviewTargetSchema", () => {
	it("requires the ids of the element", () => {
		expect(
			reviewTargetSchema.safeParse({ type: "block", chapterId: "c1" }).success,
		).toBe(false);
		expect(reviewTargetSchema.safeParse({ type: "revision" }).success).toBe(
			true,
		);
	});
});
