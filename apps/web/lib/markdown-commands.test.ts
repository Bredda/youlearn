import {
	EditorSelection,
	EditorState,
	type TransactionSpec,
} from "@codemirror/state";
import { describe, expect, it } from "vitest";
import {
	insertAtSelection,
	insertLink,
	toggleLinePrefix,
	toggleWrap,
} from "./markdown-commands";

const run = (
	doc: string,
	from: number,
	to: number,
	command: (state: EditorState) => TransactionSpec,
) => {
	const state = EditorState.create({
		doc,
		selection: EditorSelection.single(from, to),
	});
	const next = state.update(command(state)).state;
	return {
		doc: next.doc.toString(),
		selected: next.sliceDoc(next.selection.main.from, next.selection.main.to),
	};
};

describe("toggleWrap", () => {
	it("wraps the selection and keeps it selected", () => {
		expect(run("a word here", 2, 6, (s) => toggleWrap(s, "**"))).toEqual({
			doc: "a **word** here",
			selected: "word",
		});
	});

	it("unwraps a selection that is already wrapped", () => {
		expect(run("a **word** here", 4, 8, (s) => toggleWrap(s, "**"))).toEqual({
			doc: "a word here",
			selected: "word",
		});
	});

	it("drops a pair of markers at the cursor", () => {
		expect(run("ab", 1, 1, (s) => toggleWrap(s, "`")).doc).toBe("a``b");
	});
});

describe("toggleLinePrefix", () => {
	it("prefixes every selected line", () => {
		expect(
			run("one\ntwo\nthree", 0, 7, (s) => toggleLinePrefix(s, "- ")).doc,
		).toBe("- one\n- two\nthree");
	});

	it("removes the prefix when all lines have it, otherwise completes them", () => {
		expect(
			run("- one\n- two", 0, 11, (s) => toggleLinePrefix(s, "- ")).doc,
		).toBe("one\ntwo");
		expect(run("- one\ntwo", 0, 9, (s) => toggleLinePrefix(s, "- ")).doc).toBe(
			"- one\n- two",
		);
	});
});

describe("insertLink", () => {
	it("wraps the selection and selects the placeholder url", () => {
		expect(run("see docs", 4, 8, insertLink)).toEqual({
			doc: "see [docs](url)",
			selected: "url",
		});
		expect(run("", 0, 0, insertLink).doc).toBe("[texte](url)");
	});
});

describe("insertAtSelection", () => {
	it("replaces the selection", () => {
		expect(
			run("a X b", 2, 3, (s) => insertAtSelection(s, "![](asset:1)")).doc,
		).toBe("a ![](asset:1) b");
	});
});
