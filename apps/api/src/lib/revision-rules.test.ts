import type { CourseContent } from "@youlearn/types";
import { describe, expect, it } from "vitest";
import {
	isEditable,
	MAX_REVIEWERS,
	normalizeReviewerIds,
	openRevisionBlocker,
	previewBlocker,
	reviewerState,
	reviewersBlocker,
	reviewWarnings,
	summarizeReview,
	TRANSITIONS,
} from "./revision-rules";

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

describe("openRevisionBlocker", () => {
	it("lets a course without an open revision start one", () => {
		expect(openRevisionBlocker([])).toBeNull();
		expect(
			openRevisionBlocker([
				{ key: "a", status: "published" },
				{ key: "b", status: "deprecated" },
			]),
		).toBeNull();
	});

	it("refuses while a draft is open", () => {
		expect(
			openRevisionBlocker([
				{ key: "a", status: "published" },
				{ key: "b", status: "draft" },
			]),
		).toBe("Revision b is already a draft: publish or delete it first");
	});

	it("refuses while a revision is in review", () => {
		expect(openRevisionBlocker([{ key: "c", status: "preview" }])).toBe(
			"Revision c is already in review: publish or delete it first",
		);
	});
});

describe("isEditable", () => {
	it("keeps a revision editable while it is reviewed, never afterwards", () => {
		expect(isEditable("draft")).toBe(true);
		expect(isEditable("preview")).toBe(true);
		expect(isEditable("published")).toBe(false);
		expect(isEditable("deprecated")).toBe(false);
	});
});

describe("normalizeReviewerIds", () => {
	it("drops duplicates and keeps the order", () => {
		expect(normalizeReviewerIds(["b", "a", "b"])).toEqual(["b", "a"]);
	});

	it("refuses more reviewers than the limit", () => {
		const many = Array.from({ length: MAX_REVIEWERS + 1 }, (_, i) => `u${i}`);
		expect(normalizeReviewerIds(many)).toBeNull();
		expect(normalizeReviewerIds(many.slice(0, MAX_REVIEWERS))).toHaveLength(
			MAX_REVIEWERS,
		);
	});
});

describe("reviewersBlocker", () => {
	it("needs at least one reviewer", () => {
		expect(reviewersBlocker(0)).toBe(
			"Choose at least one reviewer before sending a revision to review",
		);
		expect(reviewersBlocker(1)).toBeNull();
		expect(reviewersBlocker(3)).toBeNull();
	});
});

describe("reviewerState", () => {
	it("is none before a verdict", () => {
		expect(
			reviewerState({ verdict: null, verdictRevisionUpdatedAt: null }, 1000),
		).toBe("none");
	});

	it("keeps the verdict while the revision has not changed since", () => {
		const given = {
			verdict: "approved" as const,
			verdictRevisionUpdatedAt: 1000,
		};
		expect(reviewerState(given, 1000)).toBe("approved");
		expect(reviewerState({ ...given, verdict: "changes_requested" }, 900)).toBe(
			"changes_requested",
		);
	});

	it("goes stale once the revision changed after the verdict", () => {
		expect(
			reviewerState(
				{ verdict: "approved", verdictRevisionUpdatedAt: 1000 },
				1001,
			),
		).toBe("stale");
	});
});

describe("summarizeReview and reviewWarnings", () => {
	it("counts each state", () => {
		expect(
			summarizeReview(
				["approved", "approved", "none", "stale", "changes_requested"],
				3,
			),
		).toEqual({
			approved: 2,
			changesRequested: 1,
			pending: 1,
			stale: 1,
			openThreads: 3,
		});
	});

	it("has nothing to say about a review that is done", () => {
		expect(
			reviewWarnings(summarizeReview(["approved", "approved"], 0)),
		).toEqual([]);
	});

	it("lists everything still open, singular and plural", () => {
		expect(
			reviewWarnings(
				summarizeReview(["changes_requested", "none", "none", "stale"], 1),
			),
		).toEqual([
			"1 reviewer asked for changes",
			"2 reviewers have not given a verdict",
			"1 verdict predates the latest changes",
			"1 remark is still open",
		]);
	});
});
