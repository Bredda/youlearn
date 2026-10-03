import type { CourseContent } from "@youlearn/types";
import { describe, expect, it } from "vitest";
import { previewBlocker, TRANSITIONS } from "./revision-rules";

describe("revision workflow", () => {
	it("goes draft -> preview -> published -> deprecated", () => {
		expect(TRANSITIONS.draft).toEqual(["preview"]);
		expect(TRANSITIONS.preview).toContain("published");
		expect(TRANSITIONS.published).toEqual(["deprecated"]);
	});

	it("lets a revision in preview go back to draft to be reworked", () => {
		expect(TRANSITIONS.preview).toContain("draft");
	});

	it("never publishes a draft directly", () => {
		expect(TRANSITIONS.draft).not.toContain("published");
	});

	it("has no way back from deprecated: it is cloned into a new draft instead", () => {
		expect(TRANSITIONS.deprecated).toEqual([]);
	});
});

describe("previewBlocker", () => {
	const chapter = (id: string, estimatedMinutes?: number) => ({
		id,
		title: `Chapter ${id}`,
		blocks: [],
		estimatedMinutes,
	});
	const course = (
		...chapters: ReturnType<typeof chapter>[]
	): CourseContent => ({
		version: 2,
		chapters,
	});

	it("lets a complete (or empty) draft go to review", () => {
		expect(previewBlocker(course())).toBeNull();
		expect(
			previewBlocker(course(chapter("a", 10), chapter("b", 5))),
		).toBeNull();
	});

	it("names the chapters that have no estimated duration", () => {
		expect(previewBlocker(course(chapter("a", 10), chapter("b")))).toBe(
			'Every chapter needs an estimated duration before review: missing for "Chapter b"',
		);
	});

	it("shortens a long list", () => {
		const chapters = ["a", "b", "c", "d", "e"].map((id) => chapter(id));
		expect(previewBlocker(course(...chapters))).toContain(" and 2 more");
	});
});
