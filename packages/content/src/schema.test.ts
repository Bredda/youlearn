import { describe, expect, it } from "vitest";
import { chapter, content, md, question, quiz, video } from "./fixtures";
import { contentSchema } from "./schema";

const ok = (value: unknown) => contentSchema.safeParse(value).success;
const firstPath = (value: unknown) => {
	const result = contentSchema.safeParse(value);
	return result.success ? null : result.error.issues[0]?.path;
};

describe("contentSchema", () => {
	it("accepts an empty course, markdown and video blocks, and a quiz", () => {
		expect(ok(content())).toBe(true);
		expect(
			ok(
				content(
					chapter(
						"c1",
						[md("b1", "# Hi"), video("b2")],
						quiz([question("q1"), question("q2")]),
					),
				),
			),
		).toBe(true);
	});

	it("only knows version 2", () => {
		expect(ok({ version: 1, lessons: [] })).toBe(false);
		expect(ok({ version: 2, lessons: [] })).toBe(false);
	});

	it("needs unique ids at every level", () => {
		expect(ok(content(chapter("c"), chapter("c")))).toBe(false);
		expect(ok(content(chapter("c", [md("b"), md("b")])))).toBe(false);
		expect(
			ok(content(chapter("c", [], quiz([question("q"), question("q")])))),
		).toBe(false);
		const dupOptions = {
			...question("q"),
			options: [
				{ id: "a", text: "a", correct: true },
				{ id: "a", text: "b", correct: false },
			],
		};
		expect(ok(content(chapter("c", [], quiz([dupOptions]))))).toBe(false);
	});

	it("needs a trimmed title and a non-empty id", () => {
		expect(ok(content({ ...chapter("c"), title: "   " }))).toBe(false);
		expect(ok(content(chapter("")))).toBe(false);
	});

	it("only accepts YouTube and Vimeo videos", () => {
		expect(
			ok(content(chapter("c", [video("v", "https://evil.example/x")]))),
		).toBe(false);
		expect(
			ok(content(chapter("c", [video("v", "https://vimeo.com/76979871")]))),
		).toBe(true);
	});

	it("draws n questions from a pool of m with 1 <= n <= m", () => {
		const pool = [question("q1"), question("q2"), question("q3")];
		expect(ok(content(chapter("c", [], quiz(pool, { drawCount: 3 }))))).toBe(
			true,
		);
		expect(ok(content(chapter("c", [], quiz(pool, { drawCount: 4 }))))).toBe(
			false,
		);
		expect(ok(content(chapter("c", [], quiz(pool, { drawCount: 0 }))))).toBe(
			false,
		);
		expect(
			firstPath(content(chapter("c", [], quiz(pool, { drawCount: 4 })))),
		).toEqual(["chapters", 0, "quiz", "drawCount"]);
		expect(ok(content(chapter("c", [], quiz([]))))).toBe(false);
	});

	it("keeps the pass rate between 1 and 100", () => {
		for (const passRate of [0, 101, 50.5]) {
			expect(
				ok(content(chapter("c", [], quiz([question("q")], { passRate })))),
			).toBe(false);
		}
		expect(
			ok(
				content(
					chapter(
						"c",
						[],
						quiz([question("q")], { passRate: 100, blocking: true }),
					),
				),
			),
		).toBe(true);
	});

	it("checks the correct options of a question against its type", () => {
		const twoCorrect = {
			...question("q"),
			options: question("q").options.map((o) => ({ ...o, correct: true })),
		};
		const noneCorrect = {
			...question("q"),
			options: question("q").options.map((o) => ({ ...o, correct: false })),
		};
		expect(ok(content(chapter("c", [], quiz([twoCorrect]))))).toBe(false);
		expect(
			ok(
				content(chapter("c", [], quiz([{ ...twoCorrect, type: "multiple" }]))),
			),
		).toBe(true);
		expect(
			ok(
				content(chapter("c", [], quiz([{ ...noneCorrect, type: "multiple" }]))),
			),
		).toBe(false);
		expect(ok(content(chapter("c", [], quiz([noneCorrect]))))).toBe(false);
	});

	it("needs between 2 and 10 options", () => {
		const options = (n: number) =>
			Array.from({ length: n }, (_, i) => ({
				id: `o${i}`,
				text: `o${i}`,
				correct: i === 0,
			}));
		expect(
			ok(
				content(
					chapter("c", [], quiz([{ ...question("q"), options: options(1) }])),
				),
			),
		).toBe(false);
		expect(
			ok(
				content(
					chapter("c", [], quiz([{ ...question("q"), options: options(10) }])),
				),
			),
		).toBe(true);
		expect(
			ok(
				content(
					chapter("c", [], quiz([{ ...question("q"), options: options(11) }])),
				),
			),
		).toBe(false);
	});

	it("caps the sizes", () => {
		expect(ok(content(chapter("c", [md("b", "x".repeat(200_000))])))).toBe(
			true,
		);
		expect(ok(content(chapter("c", [md("b", "x".repeat(200_001))])))).toBe(
			false,
		);
		const chapters = (n: number) =>
			Array.from({ length: n }, (_, i) => chapter(`c${i}`));
		expect(ok(content(...chapters(200)))).toBe(true);
		expect(ok(content(...chapters(201)))).toBe(false);
		const blocks = (n: number) =>
			Array.from({ length: n }, (_, i) => md(`b${i}`));
		expect(ok(content(chapter("c", blocks(50))))).toBe(true);
		expect(ok(content(chapter("c", blocks(51))))).toBe(false);
	});
});
