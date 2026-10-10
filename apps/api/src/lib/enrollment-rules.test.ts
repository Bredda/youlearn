import { describe, expect, it } from "vitest";
import {
	type PublishedRevision,
	revisionsAfter,
	revisionsBetween,
	revisionsSince,
	updateLevelFor,
	updateOfferFor,
} from "./enrollment-rules";

const revision = (
	id: string,
	status: "published" | "deprecated",
	publishedAt: number,
	changeImpact: PublishedRevision["changeImpact"] = null,
): PublishedRevision => ({ id, status, publishedAt, changeImpact });

const ids = (list: PublishedRevision[]) => list.map((r) => r.id);

describe("revisionsAfter", () => {
	const revisions = [
		revision("c", "published", 6, "minor"),
		revision("a", "deprecated", 2),
		revision("b", "deprecated", 5, "major"),
	];

	it("lists what was published after a revision, oldest first, whatever the order given", () => {
		expect(ids(revisionsAfter(revisions, "a"))).toEqual(["b", "c"]);
		expect(ids(revisionsAfter(revisions, "b"))).toEqual(["c"]);
		expect(revisionsAfter(revisions, "c")).toEqual([]);
	});

	it("is empty for an unknown revision", () => {
		expect(revisionsAfter(revisions, "nope")).toEqual([]);
	});

	it("does not need the revisions to have different update times, only publication times", () => {
		// Two revisions deprecated and published in the same transaction share a millisecond of `updatedAt`, not of
		// `publishedAt`: the order comes from the publication.
		expect(
			ids(
				revisionsAfter(
					[
						revision("a", "deprecated", 1),
						revision("b", "deprecated", 2),
						revision("c", "published", 3),
					],
					"a",
				),
			),
		).toEqual(["b", "c"]);
	});
});

describe("revisionsSince", () => {
	it("is empty for a learner on the published revision", () => {
		const revisions = [
			revision("a", "deprecated", 2),
			revision("b", "published", 3, "minor"),
		];
		expect(revisionsSince(revisions, "b")).toEqual([]);
		expect(updateLevelFor(revisions, "b")).toBeNull();
	});

	it("ignores the revisions published before the learner's one", () => {
		const revisions = [
			revision("z", "deprecated", 1, "major"),
			revision("a", "deprecated", 4),
			revision("b", "published", 5, "minor"),
		];
		expect(ids(revisionsSince(revisions, "a"))).toEqual(["b"]);
	});

	it("is empty when nothing is published now or the revision is unknown", () => {
		const unpublished = [
			revision("a", "deprecated", 2),
			revision("b", "deprecated", 3, "minor"),
		];
		expect(revisionsSince(unpublished, "a")).toEqual([]);
		expect(revisionsSince(unpublished, "nope")).toEqual([]);
	});

	it("accepts dates", () => {
		expect(
			revisionsSince(
				[
					{
						id: "a",
						status: "deprecated",
						publishedAt: new Date(2),
						changeImpact: null,
					},
					{
						id: "b",
						status: "published",
						publishedAt: new Date(3),
						changeImpact: "minor",
					},
				],
				"a",
			),
		).toHaveLength(1);
	});
});

describe("revisionsBetween", () => {
	const revisions = [
		revision("a", "deprecated", 1),
		revision("b", "deprecated", 2, "minor"),
		revision("c", "deprecated", 3, "minor"),
		revision("d", "published", 4, "major"),
	];

	it("is what a learner went through, the revision they ended on included", () => {
		expect(ids(revisionsBetween(revisions, "a", "c"))).toEqual(["b", "c"]);
		expect(ids(revisionsBetween(revisions, "a", "b"))).toEqual(["b"]);
		expect(ids(revisionsBetween(revisions, "b", "d"))).toEqual(["c", "d"]);
	});

	it("is empty when the end is not after the start", () => {
		expect(revisionsBetween(revisions, "c", "b")).toEqual([]);
		expect(revisionsBetween(revisions, "c", "c")).toEqual([]);
		expect(revisionsBetween(revisions, "a", "nope")).toEqual([]);
	});
});

describe("updateLevelFor", () => {
	it("is minor when every revision since was minor", () => {
		expect(
			updateLevelFor(
				[
					revision("a", "deprecated", 1),
					revision("b", "deprecated", 2, "minor"),
					revision("c", "published", 3, "minor"),
				],
				"a",
			),
		).toBe("minor");
	});

	it("stays major when one of them was, even if the last is minor", () => {
		const revisions = [
			revision("a", "deprecated", 1),
			revision("b", "deprecated", 2, "major"),
			revision("c", "published", 3, "minor"),
		];
		expect(updateLevelFor(revisions, "a")).toBe("major");
		expect(updateLevelFor(revisions, "b")).toBe("minor");
	});

	it("counts a revision published without an impact as major", () => {
		expect(
			updateLevelFor(
				[revision("a", "deprecated", 1), revision("b", "published", 2)],
				"a",
			),
		).toBe("major");
	});
});

describe("updateOfferFor", () => {
	const revisions = [
		revision("a", "deprecated", 1),
		revision("b", "deprecated", 2, "major"),
		revision("c", "published", 3, "minor"),
	];
	const learner = (
		overrides: Partial<Parameters<typeof updateOfferFor>[1]> = {},
	) => ({
		status: "in_progress",
		revisionId: "a",
		updatePostponedRevisionId: null,
		...overrides,
	});

	it("offers the move with its level", () => {
		expect(updateOfferFor(revisions, learner())).toEqual({
			level: "major",
			postponed: false,
		});
		expect(updateOfferFor(revisions, learner({ revisionId: "b" }))).toEqual({
			level: "minor",
			postponed: false,
		});
	});

	it("remembers a postponement for the revision published now", () => {
		expect(
			updateOfferFor(revisions, learner({ updatePostponedRevisionId: "c" })),
		).toEqual({ level: "major", postponed: true });
	});

	it("keeps it postponed when only minor revisions came after", () => {
		// Put off at b (major); c, a typo fix, does not bring the dialog back.
		expect(
			updateOfferFor(revisions, learner({ updatePostponedRevisionId: "b" })),
		).toEqual({ level: "major", postponed: true });
	});

	it("brings the offer back when a major revision came after", () => {
		const more = [
			...revisions.slice(0, 2),
			revision("c", "deprecated", 3, "minor"),
			revision("d", "published", 4, "major"),
		];
		expect(
			updateOfferFor(more, learner({ updatePostponedRevisionId: "c" })),
		).toEqual({ level: "major", postponed: false });
		// A revision without a declared impact counts as major too.
		expect(
			updateOfferFor(
				[...revisions.slice(0, 2), revision("c", "published", 3)],
				learner({ updatePostponedRevisionId: "b" }),
			),
		).toEqual({ level: "major", postponed: false });
	});

	it("forgets a postponement of an unknown revision", () => {
		expect(
			updateOfferFor(revisions, learner({ updatePostponedRevisionId: "gone" })),
		).toEqual({ level: "major", postponed: false });
	});

	it("offers nothing to a learner who is up to date or who is no longer in progress", () => {
		expect(updateOfferFor(revisions, learner({ revisionId: "c" }))).toBeNull();
		for (const status of ["completed", "failed", "superseded"])
			expect(updateOfferFor(revisions, learner({ status }))).toBeNull();
	});
});
