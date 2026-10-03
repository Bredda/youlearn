import { describe, expect, it } from "vitest";
import { question, quiz } from "./fixtures";
import {
	answersIssue,
	drawQuiz,
	gradeAttempt,
	learnerQuestions,
} from "./quiz-draw";
import type { Question } from "./schema";

/** A deterministic generator: the same seed gives the same sequence. */
const seeded = (seed: number) => () => {
	seed = (seed * 1664525 + 1013904223) % 4294967296;
	return seed / 4294967296;
};

const multiple = (id: string, correct: string[]): Question => ({
	id,
	type: "multiple",
	prompt: `Question ${id}`,
	explanation: `Because ${id}`,
	options: ["a", "b", "c"].map((o) => ({
		id: o,
		text: o,
		correct: correct.includes(o),
	})),
});

const pool = (n: number) =>
	Array.from({ length: n }, (_, i) => question(`q${i + 1}`));

describe("drawQuiz", () => {
	it("draws n distinct questions from the pool", () => {
		const q = quiz(pool(10), { drawCount: 4 });
		for (let seed = 1; seed <= 20; seed++) {
			const draw = drawQuiz(q, seeded(seed));
			const ids = draw.map((entry) => entry.questionId);
			expect(ids).toHaveLength(4);
			expect(new Set(ids).size).toBe(4);
			for (const id of ids) expect(q.questions.map((x) => x.id)).toContain(id);
		}
	});

	it("keeps every option of a question, in any order", () => {
		const q = quiz([multiple("m", ["a"])], { drawCount: 1 });
		const [entry] = drawQuiz(q, seeded(3));
		expect([...(entry?.optionIds ?? [])].sort()).toEqual(["a", "b", "c"]);
	});

	it("is reproducible with the same generator and varies with another", () => {
		const q = quiz(pool(12), { drawCount: 6 });
		expect(drawQuiz(q, seeded(7))).toEqual(drawQuiz(q, seeded(7)));
		expect(drawQuiz(q, seeded(7))).not.toEqual(drawQuiz(q, seeded(8)));
	});

	it("draws the whole pool when n equals m", () => {
		const q = quiz(pool(3), { drawCount: 3 });
		expect(
			drawQuiz(q)
				.map((entry) => entry.questionId)
				.sort(),
		).toEqual(["q1", "q2", "q3"]);
	});
});

describe("learnerQuestions", () => {
	const q = quiz([multiple("m", ["a", "b"]), question("s")], { drawCount: 2 });
	const draw = drawQuiz(q, seeded(5));
	const shown = learnerQuestions(q, draw);

	it("follows the draw order and option order", () => {
		expect(shown.map((x) => x.id)).toEqual(draw.map((d) => d.questionId));
		expect(shown.map((x) => x.options.map((o) => o.id))).toEqual(
			draw.map((d) => d.optionIds),
		);
	});

	it("never carries an answer nor an explanation", () => {
		const json = JSON.stringify(shown);
		expect(json).not.toContain("correct");
		expect(json).not.toContain("Because");
		expect(json).not.toContain("explanation");
	});
});

describe("gradeAttempt", () => {
	const q = quiz([question("s1"), question("s2"), multiple("m", ["a", "c"])], {
		drawCount: 3,
		passRate: 70,
	});
	const draw = [
		{ questionId: "s1", optionIds: ["a", "b"] },
		{ questionId: "s2", optionIds: ["b", "a"] },
		{ questionId: "m", optionIds: ["c", "b", "a"] },
	];

	it("passes a perfect attempt", () => {
		const grade = gradeAttempt(q, draw, {
			s1: ["a"],
			s2: ["a"],
			m: ["c", "a"],
		});
		expect(grade.score).toBe(100);
		expect(grade.passed).toBe(true);
		expect(grade.corrections.every((c) => c.correct)).toBe(true);
	});

	it("counts a missing answer as wrong", () => {
		const grade = gradeAttempt(q, draw, { s1: ["a"], m: ["a", "c"] });
		expect(grade.score).toBe(67);
		expect(grade.passed).toBe(false);
		expect(grade.corrections.find((c) => c.questionId === "s2")?.correct).toBe(
			false,
		);
	});

	it("needs exactly the right options on a multiple choice", () => {
		const missing = gradeAttempt(q, draw, { m: ["a"] });
		const extra = gradeAttempt(q, draw, { m: ["a", "b", "c"] });
		expect(missing.corrections.find((c) => c.questionId === "m")?.correct).toBe(
			false,
		);
		expect(extra.corrections.find((c) => c.questionId === "m")?.correct).toBe(
			false,
		);
	});

	it("reaches the pass rate exactly", () => {
		const four = quiz(pool(4), { drawCount: 4, passRate: 75 });
		const d = drawQuiz(four, seeded(2));
		const answers = Object.fromEntries(
			d.slice(0, 3).map((e) => [e.questionId, ["a"]]),
		);
		const grade = gradeAttempt(four, d, answers);
		expect(grade.score).toBe(75);
		expect(grade.passed).toBe(true);
	});

	it("returns the right options and the explanation for the correction", () => {
		const grade = gradeAttempt(q, draw, {});
		const m = grade.corrections.find((c) => c.questionId === "m");
		expect(m?.correctOptionIds).toEqual(["a", "c"]);
		expect(m?.explanation).toBe("Because m");
		expect(
			grade.corrections.find((c) => c.questionId === "s1")?.explanation,
		).toBeUndefined();
	});

	it("only grades the drawn questions", () => {
		const grade = gradeAttempt(q, [draw[0]!], { s1: ["a"] });
		expect(grade.corrections).toHaveLength(1);
		expect(grade.score).toBe(100);
	});
});

describe("answersIssue", () => {
	const q = quiz([question("s1"), multiple("m", ["a"])], { drawCount: 2 });
	const draw = [
		{ questionId: "s1", optionIds: ["a", "b"] },
		{ questionId: "m", optionIds: ["a", "b", "c"] },
	];

	it("accepts partial answers", () => {
		expect(answersIssue(q, draw, {})).toBeNull();
		expect(answersIssue(q, draw, { s1: ["a"], m: ["a", "c"] })).toBeNull();
	});

	it("refuses a question that was not drawn, an unknown option and a repeat", () => {
		expect(answersIssue(q, [draw[0]!], { m: ["a"] })).toMatch(/not part/);
		expect(answersIssue(q, draw, { zz: ["a"] })).toMatch(/not part/);
		expect(answersIssue(q, draw, { s1: ["z"] })).toMatch(/unknown option/);
		expect(answersIssue(q, draw, { m: ["a", "a"] })).toMatch(/repeated/);
	});

	it("refuses several options on a single choice question", () => {
		expect(answersIssue(q, draw, { s1: ["a", "b"] })).toMatch(/single option/);
	});
});
