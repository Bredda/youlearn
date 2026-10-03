import { describe, expect, it } from "vitest";
import { deepEqual, diffContent, diffInline, pairById } from "./diff";
import {
	chapter,
	content,
	finalExam,
	md,
	question,
	quiz,
	video,
} from "./fixtures";

const ids = (items: { id: string }[]) => items.map((i) => i.id);

describe("deepEqual", () => {
	it("ignores key order and undefined properties", () => {
		expect(
			deepEqual({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 }),
		).toBe(true);
		expect(deepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
		expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
		expect(deepEqual([1, 2], [2, 1])).toBe(false);
		expect(deepEqual(null, {})).toBe(false);
	});
});

describe("pairById", () => {
	const item = (id: string) => ({ id });

	it("follows the new order and places removed items after their predecessor", () => {
		const pairs = pairById(
			["a", "b", "c", "d"].map(item),
			["a", "c", "e"].map(item),
		);
		expect(ids(pairs)).toEqual(["a", "b", "c", "d", "e"]);
		expect(pairs.filter((p) => p.after === null).map((p) => p.id)).toEqual([
			"b",
			"d",
		]);
		expect(pairs.find((p) => p.id === "e")?.before).toBeNull();
	});

	it("puts removed items that had no predecessor first", () => {
		expect(ids(pairById(["x", "a"].map(item), ["a"].map(item)))).toEqual([
			"x",
			"a",
		]);
	});

	it("flags the items that changed rank, not their neighbours", () => {
		const moved = (from: string[], to: string[]) =>
			pairById(from.map(item), to.map(item))
				.filter((p) => p.moved)
				.map((p) => p.id);
		expect(moved(["a", "b", "c"], ["a", "b", "c"])).toEqual([]);
		expect(moved(["a", "b", "c", "d"], ["d", "a", "b", "c"])).toEqual(["d"]);
		expect(moved(["a", "b", "c", "d"], ["b", "c", "d", "a"])).toEqual(["a"]);
		expect(moved(["a", "b"], ["b", "a"])).toHaveLength(1);
	});
});

describe("diffContent", () => {
	it("reports nothing for identical contents", () => {
		const value = content(
			chapter("c1", [md("b1", "x")], quiz([question("q1")])),
		);
		const diff = diffContent(value, structuredClone(value));
		expect(diff.changed).toBe(false);
		expect(diff.stats).toEqual({ linesAdded: 0, linesRemoved: 0, changes: 0 });
	});

	it("finds added, removed and modified chapters by id", () => {
		const diff = diffContent(
			content(
				chapter("keep", [md("b", "one")]),
				chapter("gone", [md("g", "bye")]),
			),
			content(
				chapter("keep", [md("b", "two")]),
				chapter("new", [md("n", "hi")]),
			),
		);
		const status = Object.fromEntries(
			diff.chapters.map((c) => [c.id, c.status]),
		);
		expect(status).toEqual({ keep: "modified", gone: "removed", new: "added" });
		expect(diff.changed).toBe(true);
	});

	it("counts changed markdown lines per chapter", () => {
		const diff = diffContent(
			content(chapter("c", [md("b", "a\nb\nc\n")])),
			content(chapter("c", [md("b", "a\nB\nc\nd\n")])),
		);
		const block = diff.chapters[0]?.blocks[0];
		expect(block?.status).toBe("modified");
		expect(diff.chapters[0]?.stats).toEqual({
			linesAdded: 2,
			linesRemoved: 1,
			changes: 1,
		});
		expect(block?.lines.map((l) => l.kind)).toEqual([
			"equal",
			"removed",
			"added",
			"equal",
			"added",
		]);
	});

	it("is not fooled by a missing trailing newline", () => {
		const diff = diffContent(
			content(chapter("c", [md("b", "a\nb")])),
			content(chapter("c", [md("b", "a\nb\n")])),
		);
		expect(diff.chapters[0]?.stats.linesAdded).toBe(0);
	});

	it("detects a reordered chapter and block without calling the content modified", () => {
		const diff = diffContent(
			content(chapter("a"), chapter("b"), chapter("c")),
			content(chapter("c"), chapter("a"), chapter("b")),
		);
		expect(diff.chapters.filter((c) => c.moved).map((c) => c.id)).toEqual([
			"c",
		]);
		expect(diff.chapters.every((c) => c.status === "unchanged")).toBe(true);
		expect(diff.changed).toBe(true);

		const blocks = diffContent(
			content(chapter("c", [md("1"), md("2")])),
			content(chapter("c", [md("2"), md("1")])),
		);
		expect(blocks.chapters[0]?.status).toBe("modified");
	});

	it("compares videos by url and title", () => {
		const diff = diffContent(
			content(chapter("c", [video("v", "https://youtu.be/dQw4w9WgXcQ")])),
			content(chapter("c", [video("v", "https://vimeo.com/76979871")])),
		);
		const block = diff.chapters[0]?.blocks[0];
		expect(block?.status).toBe("modified");
		expect(block?.lines).toEqual([]);
	});

	it("flags the option whose correctness flipped", () => {
		const diff = diffContent(
			content(chapter("c", [], quiz([question("q", "a")]))),
			content(chapter("c", [], quiz([question("q", "b")]))),
		);
		const q = diff.chapters[0]?.quiz?.questions[0];
		expect(q?.status).toBe("modified");
		expect(q?.options.filter((o) => o.correctChanged).map((o) => o.id)).toEqual(
			["a", "b"],
		);
	});

	it("reports quiz settings, questions and the quiz appearing or disappearing", () => {
		const base = chapter("c", [], quiz([question("q1"), question("q2")]));
		const changed = chapter(
			"c",
			[],
			quiz([question("q1"), question("q3")], { blocking: true, passRate: 80 }),
		);
		const quizDiff = diffContent(content(base), content(changed)).chapters[0]
			?.quiz;
		expect(quizDiff?.settingsChanged).toEqual(["blocking", "passRate"]);
		expect(quizDiff?.questions.map((q) => [q.id, q.status])).toEqual([
			["q1", "unchanged"],
			["q2", "removed"],
			["q3", "added"],
		]);

		const added = diffContent(content(chapter("c")), content(base)).chapters[0];
		expect(added?.quiz?.status).toBe("added");
		expect(added?.status).toBe("modified");
		const removed = diffContent(content(base), content(chapter("c")))
			.chapters[0];
		expect(removed?.quiz?.status).toBe("removed");
	});

	it("shows an image that was replaced as a change of the block body", () => {
		const diff = diffContent(
			content(chapter("c", [md("b", "![](asset:one)\n")])),
			content(chapter("c", [md("b", "![](asset:two)\n")])),
		);
		expect(diff.chapters[0]?.blocks[0]?.status).toBe("modified");
	});
});

describe("diffInline", () => {
	it("highlights the words that changed", () => {
		const parts = diffInline("the quick fox", "the slow fox");
		expect(
			parts.filter((p) => p.kind === "removed").map((p) => p.text),
		).toEqual(["quick"]);
		expect(parts.filter((p) => p.kind === "added").map((p) => p.text)).toEqual([
			"slow",
		]);
	});
});

describe("diffContent: duration and certification", () => {
	const timed = (minutes?: number) =>
		content({ ...chapter("c1"), estimatedMinutes: minutes });

	it("flags a chapter whose estimated duration changed", () => {
		const diff = diffContent(timed(10), timed(25));
		expect(diff.changed).toBe(true);
		expect(diff.chapters[0]?.durationChanged).toBe(true);
		expect(diff.chapters[0]?.status).toBe("modified");
		expect(diff.stats.changes).toBe(1);
		expect(diffContent(timed(10), timed(10)).changed).toBe(false);
	});

	it("treats a first estimate as a change, but not a new chapter's", () => {
		expect(diffContent(timed(), timed(10)).chapters[0]?.durationChanged).toBe(
			true,
		);
		const added = diffContent(content(), timed(10));
		expect(added.chapters[0]?.durationChanged).toBe(false);
		expect(added.chapters[0]?.status).toBe("added");
	});

	it("flags a course that becomes certifying", () => {
		const before = content(chapter("c1"));
		const after = { ...content(chapter("c1"), finalExam()), certifying: true };
		const diff = diffContent(before, after);
		expect(diff.certifyingChanged).toBe(true);
		expect(diffContent(before, before).certifyingChanged).toBe(false);
		// Undefined and false are the same thing.
		expect(
			diffContent(before, { ...before, certifying: false }).certifyingChanged,
		).toBe(false);
	});
});
