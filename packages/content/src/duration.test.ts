import { describe, expect, it } from "vitest";
import {
	chaptersMissingDuration,
	courseDurationMinutes,
	formatDuration,
} from "./duration";
import { chapter, content } from "./fixtures";

const timed = (id: string, estimatedMinutes?: number) => ({
	...chapter(id),
	estimatedMinutes,
});

describe("courseDurationMinutes", () => {
	it("sums the chapters and ignores those without estimate", () => {
		expect(courseDurationMinutes(content())).toBe(0);
		expect(
			courseDurationMinutes(
				content(timed("a", 20), timed("b"), timed("c", 45)),
			),
		).toBe(65);
	});
});

describe("chaptersMissingDuration", () => {
	it("lists the chapters without estimate", () => {
		const missing = chaptersMissingDuration(
			content(timed("a", 20), timed("b"), timed("c")),
		);
		expect(missing.map((c) => c.id)).toEqual(["b", "c"]);
	});
});

describe("formatDuration", () => {
	it("shows minutes under an hour, then hours and minutes", () => {
		expect(formatDuration(45)).toBe("45 min");
		expect(formatDuration(60)).toBe("1 h");
		expect(formatDuration(125)).toBe("2 h 05");
		expect(formatDuration(150)).toBe("2 h 30");
	});

	it("shows nothing for a zero or invalid duration", () => {
		expect(formatDuration(0)).toBe("");
		expect(formatDuration(-3)).toBe("");
		expect(formatDuration(Number.NaN)).toBe("");
	});
});
