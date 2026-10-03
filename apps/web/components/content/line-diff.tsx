import {
	diffInline,
	type InlineChange,
	type LineChange,
} from "@youlearn/content";

/** Context lines kept around a change; longer unchanged runs are folded. */
const CONTEXT = 2;

const TINTS = {
	added: "bg-green-500/10 border-green-500",
	removed: "bg-red-500/10 border-red-500",
	equal: "border-transparent",
} as const;

const MARKS = {
	added: "bg-green-500/30",
	removed: "bg-red-500/30",
} as const;

type Part = { key: string; kind: InlineChange["kind"]; text: string };
type Row =
	| {
			kind: "equal" | "added" | "removed";
			key: string;
			text: string;
			inline?: Part[];
	  }
	| { kind: "fold"; key: string; count: number };

const splitLines = (text: string) => text.replace(/\n$/, "").split("\n");

/** Unchanged lines as rows, folding the middle of a long run (kept around a change only). */
function equalRows(
	key: string,
	lines: string[],
	head: number,
	tail: number,
): Row[] {
	const line = (text: string, id: string): Row => ({
		kind: "equal",
		key: `${key}.${id}`,
		text,
	});
	if (lines.length <= head + tail + 1) {
		return lines.map((text, i) => line(text, String(i)));
	}
	return [
		...lines.slice(0, head).map((text, i) => line(text, `h${i}`)),
		{ kind: "fold", key: `${key}.fold`, count: lines.length - head - tail },
		...lines.slice(lines.length - tail).map((text, i) => line(text, `t${i}`)),
	];
}

/** Folds long unchanged runs and pairs a removed chunk with the added one right after it for word level marks. */
function toRows(changes: LineChange[]): Row[] {
	const rows: Row[] = [];
	for (const [index, change] of changes.entries()) {
		const key = `${index}`;
		if (change.kind === "equal") {
			const first = index === 0;
			const last = index === changes.length - 1;
			rows.push(
				...equalRows(
					key,
					splitLines(change.text),
					first ? 0 : CONTEXT,
					last ? 0 : CONTEXT,
				),
			);
			continue;
		}
		const next = changes[index + 1];
		const previous = changes[index - 1];
		const partner =
			change.kind === "removed" && next?.kind === "added"
				? next
				: change.kind === "added" && previous?.kind === "removed"
					? previous
					: undefined;
		const inline = partner
			? diffInline(
					change.kind === "removed" ? change.text : partner.text,
					change.kind === "removed" ? partner.text : change.text,
				)
					.filter((part) => part.kind === "equal" || part.kind === change.kind)
					.map((part, i) => ({ ...part, key: `${key}.${i}` }))
			: undefined;
		rows.push({
			kind: change.kind,
			key,
			text: change.text.replace(/\n$/, ""),
			inline,
		});
	}
	return rows;
}

/** Line diff of a text (markdown source of a block, prompt of a question). */
export function LineDiff({ changes }: { changes: LineChange[] }) {
	const rows = toRows(changes);
	return (
		<div className="overflow-x-auto rounded-md border font-mono text-xs">
			{rows.map((row) =>
				row.kind === "fold" ? (
					<div
						key={row.key}
						className="bg-muted px-3 py-0.5 text-muted-foreground"
					>
						… {row.count} ligne{row.count > 1 ? "s" : ""} inchangée
						{row.count > 1 ? "s" : ""} …
					</div>
				) : (
					<pre
						key={row.key}
						className={`whitespace-pre-wrap border-l-2 px-3 py-0.5 ${TINTS[row.kind]}`}
					>
						<span
							aria-hidden
							className="select-none pr-2 text-muted-foreground"
						>
							{row.kind === "added" ? "+" : row.kind === "removed" ? "−" : " "}
						</span>
						<span className="sr-only">
							{row.kind === "added"
								? "Ajouté : "
								: row.kind === "removed"
									? "Retiré : "
									: ""}
						</span>
						{row.inline
							? row.inline.map((part) =>
									part.kind === "equal" ? (
										<span key={part.key}>{part.text}</span>
									) : (
										<mark
											key={part.key}
											className={`rounded-sm text-inherit ${MARKS[part.kind]}`}
										>
											{part.text}
										</mark>
									),
								)
							: row.text}
					</pre>
				),
			)}
		</div>
	);
}
