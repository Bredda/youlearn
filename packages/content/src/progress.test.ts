import { describe, expect, it } from "vitest";
import { chapter, content, finalExam, md, question, quiz } from "./fixtures";
import {
	canCompleteChapter,
	chapterStates,
	enrollmentOutcome,
	type Progress,
} from "./progress";

const progress = (
	completed: string[] = [],
	passed: string[] = [],
): Progress => ({
	completed: new Set(completed),
	passedQuizzes: new Set(passed),
});

const blocking = () => quiz([question("q1")], { blocking: true, passRate: 70 });
const optional = () => quiz([question("q1")], { blocking: false });

describe("chapterStates", () => {
	it("opens every chapter when nothing blocks", () => {
		const c = content(chapter("a", [md("1")]), chapter("b", [md("2")]));
		expect(chapterStates(c, progress())).toEqual({
			a: "available",
			b: "available",
		});
	});

	it("marks finished chapters as completed", () => {
		const c = content(chapter("a"), chapter("b"));
		expect(chapterStates(c, progress(["a"]))).toEqual({
			a: "completed",
			b: "available",
		});
	});

	it("locks everything after a blocking quiz that is not passed", () => {
		const c = content(
			chapter("a"),
			chapter("b", [], blocking()),
			chapter("c"),
			chapter("d"),
		);
		expect(chapterStates(c, progress(["a"]))).toEqual({
			a: "completed",
			b: "available",
			c: "locked",
			d: "locked",
		});
	});

	it("unlocks the next chapters once the blocking quiz is passed", () => {
		const c = content(chapter("b", [], blocking()), chapter("c"));
		expect(chapterStates(c, progress([], ["b"]))).toEqual({
			b: "available",
			c: "available",
		});
	});

	it("does not lock after a non blocking quiz", () => {
		const c = content(chapter("a", [], optional()), chapter("b"));
		expect(chapterStates(c, progress()).b).toBe("available");
	});

	it("locks the final exam until every other chapter is completed", () => {
		const c = content(chapter("a"), chapter("b"), finalExam("exam"));
		expect(chapterStates(c, progress(["a"])).exam).toBe("locked");
		expect(chapterStates(c, progress(["a", "b"])).exam).toBe("available");
		expect(chapterStates(c, progress(["a", "b", "exam"])).exam).toBe(
			"completed",
		);
	});
});

describe("canCompleteChapter", () => {
	const c = content(
		chapter("a"),
		chapter("b", [], blocking()),
		chapter("c"),
		finalExam("exam"),
	);

	it("accepts an open chapter", () => {
		expect(canCompleteChapter(c, "a", progress())).toEqual({ ok: true });
	});

	it("refuses an unknown chapter", () => {
		expect(canCompleteChapter(c, "zzz", progress())).toEqual({
			ok: false,
			reason: "UNKNOWN_CHAPTER",
		});
	});

	it("refuses a chapter whose blocking quiz is not passed, then accepts it", () => {
		expect(canCompleteChapter(c, "b", progress(["a"]))).toEqual({
			ok: false,
			reason: "QUIZ_NOT_PASSED",
		});
		expect(canCompleteChapter(c, "b", progress(["a"], ["b"]))).toEqual({
			ok: true,
		});
	});

	it("refuses a locked chapter", () => {
		expect(canCompleteChapter(c, "c", progress(["a"]))).toEqual({
			ok: false,
			reason: "LOCKED",
		});
	});

	it("never completes the final exam by hand", () => {
		expect(
			canCompleteChapter(c, "exam", progress(["a", "b", "c"], ["b"])),
		).toEqual({ ok: false, reason: "FINAL_EXAM" });
	});

	it("is idempotent for a completed chapter", () => {
		expect(canCompleteChapter(c, "b", progress(["a", "b"], ["b"]))).toEqual({
			ok: true,
		});
	});
});

describe("enrollmentOutcome", () => {
	it("completes a course once every chapter is", () => {
		const c = content(chapter("a"), chapter("b"));
		expect(enrollmentOutcome(c, new Set(["a"]))).toBe("in_progress");
		expect(enrollmentOutcome(c, new Set(["a", "b"]))).toBe("completed");
	});

	it("waits for the final exam in a certifying course", () => {
		const c = content(chapter("a"), finalExam("exam"));
		expect(enrollmentOutcome(c, new Set(["a"]))).toBe("in_progress");
		expect(enrollmentOutcome(c, new Set(["a", "exam"]))).toBe("completed");
	});

	it("never completes an empty course", () => {
		expect(enrollmentOutcome(content(), new Set())).toBe("in_progress");
	});
});
