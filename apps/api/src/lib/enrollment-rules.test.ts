import { describe, expect, it } from "vitest";
import {
	type PublishedRevision,
	revisionsSince,
	updateLevelFor,
} from "./enrollment-rules";

const revision = (
	id: string,
	status: "published" | "deprecated",
	updatedAt: number,
	changeImpact: PublishedRevision["changeImpact"] = null,
): PublishedRevision => ({ id, status, updatedAt, changeImpact });

describe("revisionsSince", () => {
	it("is empty for a learner on the published revision", () => {
		const revisions = [
			revision("a", "deprecated", 2),
			revision("b", "published", 3, "minor"),
		];
		expect(revisionsSince(revisions, "b")).toEqual([]);
		expect(updateLevelFor(revisions, "b")).toBeNull();
	});

	it("lists what was published after the learner's revision, oldest first", () => {
		const revisions = [
			revision("c", "published", 6, "minor"),
			revision("a", "deprecated", 2),
			revision("b", "deprecated", 5, "major"),
		];
		expect(revisionsSince(revisions, "a").map((r) => r.id)).toEqual(["b", "c"]);
		expect(revisionsSince(revisions, "b").map((r) => r.id)).toEqual(["c"]);
	});

	it("ignores the revisions published before the learner's one", () => {
		const revisions = [
			revision("z", "deprecated", 1, "major"),
			revision("a", "deprecated", 4),
			revision("b", "published", 5, "minor"),
		];
		expect(revisionsSince(revisions, "a").map((r) => r.id)).toEqual(["b"]);
	});

	it("counts the revision published in the same millisecond as the deprecation", () => {
		const revisions = [
			revision("a", "deprecated", 7),
			revision("b", "published", 7, "minor"),
		];
		expect(revisionsSince(revisions, "a").map((r) => r.id)).toEqual(["b"]);
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
						updatedAt: new Date(2),
						changeImpact: null,
					},
					{
						id: "b",
						status: "published",
						updatedAt: new Date(3),
						changeImpact: "minor",
					},
				],
				"a",
			),
		).toHaveLength(1);
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
