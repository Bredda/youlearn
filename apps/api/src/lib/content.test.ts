import { describe, expect, it } from "vitest";
import { contentSchema } from "./content";

const lesson = (id: string, overrides: Record<string, unknown> = {}) => ({
	id,
	title: `Lesson ${id}`,
	type: "markdown",
	body: "# Hello",
	...overrides,
});

const valid = (...lessons: unknown[]) => ({ version: 1, lessons });

describe("contentSchema", () => {
	it("accepts an empty course and ordered lessons", () => {
		expect(contentSchema.safeParse(valid()).success).toBe(true);
		expect(
			contentSchema.safeParse(valid(lesson("a"), lesson("b"))).success,
		).toBe(true);
	});

	it("only knows version 1 markdown lessons", () => {
		expect(contentSchema.safeParse({ version: 2, lessons: [] }).success).toBe(
			false,
		);
		expect(
			contentSchema.safeParse(valid(lesson("a", { type: "video" }))).success,
		).toBe(false);
	});

	it("refuses duplicate lesson ids", () => {
		const result = contentSchema.safeParse(valid(lesson("a"), lesson("a")));
		expect(result.success).toBe(false);
		expect(result.error?.issues[0]?.path).toEqual(["lessons"]);
	});

	it("needs a title once trimmed and an id", () => {
		expect(
			contentSchema.safeParse(valid(lesson("a", { title: "   " }))).success,
		).toBe(false);
		expect(contentSchema.safeParse(valid(lesson(""))).success).toBe(false);
	});

	it("caps the size of a lesson and the number of lessons", () => {
		expect(
			contentSchema.safeParse(valid(lesson("a", { body: "x".repeat(200_001) })))
				.success,
		).toBe(false);
		const many = Array.from({ length: 201 }, (_, i) => lesson(String(i)));
		expect(contentSchema.safeParse(valid(...many)).success).toBe(false);
	});
});
