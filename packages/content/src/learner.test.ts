import { describe, expect, it } from "vitest";
import { chapter, content, finalExam, md, question, quiz } from "./fixtures";
import { toLearnerContent } from "./learner";

describe("toLearnerContent", () => {
	const source = content(
		chapter("one", [md("b1", "Hello")], {
			...quiz([question("q1"), question("q2")], {
				blocking: true,
				drawCount: 2,
				passRate: 80,
			}),
		}),
		chapter("two", [md("b2")]),
		finalExam("exam"),
	);
	const learner = toLearnerContent(source);

	it("never carries an answer nor a question", () => {
		const json = JSON.stringify(learner);
		expect(json).not.toContain('"correct"');
		expect(json).not.toContain("Question q1");
		expect(json).not.toContain('"questions"');
	});

	it("keeps the settings of the quiz and the size of the pool", () => {
		expect(learner.chapters[0]?.quiz).toEqual({
			blocking: true,
			passRate: 80,
			drawCount: 2,
			poolSize: 2,
		});
	});

	it("keeps chapters, blocks and the final exam kind", () => {
		expect(learner.chapters.map((c) => c.id)).toEqual(["one", "two", "exam"]);
		expect(learner.chapters[0]?.blocks).toEqual(source.chapters[0]?.blocks);
		expect(learner.chapters[1]?.quiz).toBeUndefined();
		expect(learner.chapters[2]?.kind).toBe("final-exam");
	});

	it("does not touch the source", () => {
		expect(source.chapters[0]?.quiz?.questions).toHaveLength(2);
	});
});
