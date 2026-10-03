import { describe, expect, it } from "vitest";
import { TRANSITIONS } from "./revision-rules";

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
