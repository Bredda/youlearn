import {
	EditorSelection,
	type EditorState,
	type TransactionSpec,
} from "@codemirror/state";

/**
 * Edits behind the toolbar of the markdown editor. They only describe a transaction from a state, so they run
 * (and are tested) without a DOM.
 */

/** Wraps the selection with `marker` (`**` for bold...), or unwraps it when it is already wrapped. */
export function toggleWrap(
	state: EditorState,
	marker: string,
): TransactionSpec {
	const size = marker.length;
	return state.changeByRange((range) => {
		const { from, to } = range;
		const wrapped =
			state.sliceDoc(from - size, from) === marker &&
			state.sliceDoc(to, to + size) === marker;
		if (wrapped) {
			return {
				changes: [
					{ from: from - size, to: from },
					{ from: to, to: to + size },
				],
				range: EditorSelection.range(from - size, to - size),
			};
		}
		return {
			changes: [
				{ from, insert: marker },
				{ from: to, insert: marker },
			],
			range: EditorSelection.range(from + size, to + size),
		};
	});
}

/** Adds `prefix` (`# `, `- `, `> `) to every selected line, or removes it when all of them already have it. */
export function toggleLinePrefix(
	state: EditorState,
	prefix: string,
): TransactionSpec {
	const lines = new Map<number, { from: number; text: string }>();
	for (const range of state.selection.ranges) {
		const first = state.doc.lineAt(range.from).number;
		const last = state.doc.lineAt(range.to).number;
		for (let n = first; n <= last; n++) {
			const line = state.doc.line(n);
			lines.set(n, { from: line.from, text: line.text });
		}
	}
	const all = [...lines.values()];
	const present = all.every((line) => line.text.startsWith(prefix));
	return {
		changes: present
			? all.map((line) => ({ from: line.from, to: line.from + prefix.length }))
			: // Only the lines that lack it: completing a list must not nest the lines that already belong to it.
				all
					.filter((line) => !line.text.startsWith(prefix))
					.map((line) => ({ from: line.from, insert: prefix })),
	};
}

/** `[selection](url)` with `url` selected, ready to be typed over. */
export function insertLink(state: EditorState): TransactionSpec {
	return state.changeByRange((range) => {
		const label = state.sliceDoc(range.from, range.to) || "texte";
		const text = `[${label}](url)`;
		const urlStart = range.from + label.length + 3;
		return {
			changes: { from: range.from, to: range.to, insert: text },
			range: EditorSelection.range(urlStart, urlStart + 3),
		};
	});
}

/** Inserts `text` at the cursor, replacing the selection. */
export function insertAtSelection(
	state: EditorState,
	text: string,
): TransactionSpec {
	return state.changeByRange((range) => ({
		changes: { from: range.from, to: range.to, insert: text },
		range: EditorSelection.cursor(range.from + text.length),
	}));
}
