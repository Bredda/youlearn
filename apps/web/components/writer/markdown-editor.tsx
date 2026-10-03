"use client";

import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import {
	defaultHighlightStyle,
	syntaxHighlighting,
} from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { unifiedMergeView } from "@codemirror/merge";
import {
	Compartment,
	EditorState,
	type Extension,
	type TransactionSpec,
} from "@codemirror/state";
import { oneDarkHighlightStyle } from "@codemirror/theme-one-dark";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { IconName } from "@/lib/icons";
import {
	insertAtSelection,
	insertLink,
	toggleLinePrefix,
	toggleWrap,
} from "@/lib/markdown-commands";

const isImage = (file: File) => file.type.startsWith("image/");

const colors = (dark: boolean): Extension => [
	EditorView.theme(
		{
			"&": {
				backgroundColor: "var(--background)",
				color: "var(--foreground)",
				fontSize: "13px",
			},
			"&.cm-focused": { outline: "none" },
			".cm-scroller": {
				fontFamily: "var(--font-mono)",
				minHeight: "10rem",
				maxHeight: "36rem",
				overflow: "auto",
			},
			".cm-content": { caretColor: "var(--foreground)", padding: "8px 0" },
			".cm-cursor": { borderLeftColor: "var(--foreground)" },
			".cm-gutters": {
				backgroundColor: "var(--muted)",
				color: "var(--muted-foreground)",
				border: "none",
			},
		},
		{ dark },
	),
	syntaxHighlighting(dark ? oneDarkHighlightStyle : defaultHighlightStyle),
];

const diffExtension = (source: string | undefined): Extension =>
	source === undefined
		? []
		: unifiedMergeView({
				original: source,
				mergeControls: false,
				highlightChanges: true,
				gutter: true,
				allowInlineDiffs: true,
				collapseUnchanged: { margin: 2, minSize: 6 },
			});

type Tool = {
	name: IconName;
	label: string;
	run: (state: EditorState) => TransactionSpec;
};

const TOOLS: Tool[] = [
	{ name: "bold", label: "Gras (Ctrl+B)", run: (s) => toggleWrap(s, "**") },
	{
		name: "italic",
		label: "Italique (Ctrl+I)",
		run: (s) => toggleWrap(s, "*"),
	},
	{ name: "heading", label: "Titre", run: (s) => toggleLinePrefix(s, "## ") },
	{ name: "inlineCode", label: "Code", run: (s) => toggleWrap(s, "`") },
	{ name: "link", label: "Lien", run: insertLink },
	{ name: "list", label: "Liste", run: (s) => toggleLinePrefix(s, "- ") },
	{ name: "quote", label: "Citation", run: (s) => toggleLinePrefix(s, "> ") },
];

/**
 * CodeMirror 6 editor for a markdown source: toolbar, shortcuts, highlighted code fences, image upload by paste,
 * drop or button and, when `original` is given, an inline diff against it. Load it with `next/dynamic`
 * (`ssr: false`): CodeMirror needs the DOM.
 */
export default function MarkdownEditor({
	value,
	onChange,
	readOnly = false,
	original,
	uploadImage,
	label,
}: {
	value: string;
	onChange: (value: string) => void;
	readOnly?: boolean;
	/** Source the editor is compared with: the inline diff shows while it is defined. */
	original?: string | undefined;
	/** Uploads an image and returns the markdown that displays it. */
	uploadImage?: (file: File) => Promise<string>;
	/** Accessible name of the editing area. */
	label: string;
}) {
	const { resolvedTheme } = useTheme();
	const dark = resolvedTheme === "dark";
	const host = useRef<HTMLDivElement>(null);
	const fileInput = useRef<HTMLInputElement>(null);
	const view = useRef<EditorView | null>(null);
	const compartments = useRef({
		theme: new Compartment(),
		diff: new Compartment(),
		readOnly: new Compartment(),
	});
	// Handlers live as long as the view: they read the latest props through refs.
	const latest = useRef({ onChange, uploadImage, dark, original, readOnly });
	latest.current = { onChange, uploadImage, dark, original, readOnly };
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string>();

	async function attach(file: File) {
		const target = view.current;
		const upload = latest.current.uploadImage;
		if (!target || !upload) return;
		setUploading(true);
		setError(undefined);
		try {
			const snippet = await upload(file);
			target.dispatch(insertAtSelection(target.state, snippet));
			target.focus();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Échec de l'envoi de l'image");
		} finally {
			setUploading(false);
		}
	}

	// Created once. Everything that changes later goes through the compartments or the sync effect below.
	// biome-ignore lint/correctness/useExhaustiveDependencies: the view is built once, see above
	useEffect(() => {
		if (!host.current) return;
		const run = (tool: Tool) => (target: EditorView) => {
			target.dispatch(tool.run(target.state));
			return true;
		};
		const state = EditorState.create({
			doc: value,
			extensions: [
				history(),
				keymap.of([
					{ key: "Mod-b", run: run(TOOLS[0] as Tool) },
					{ key: "Mod-i", run: run(TOOLS[1] as Tool) },
					...defaultKeymap,
					...historyKeymap,
				]),
				markdown({ base: markdownLanguage, codeLanguages: languages }),
				EditorView.lineWrapping,
				EditorView.contentAttributes.of({ "aria-label": label }),
				placeholder("Rédigez en markdown…"),
				compartments.current.theme.of(colors(latest.current.dark)),
				compartments.current.diff.of(diffExtension(latest.current.original)),
				compartments.current.readOnly.of(
					EditorState.readOnly.of(latest.current.readOnly),
				),
				EditorView.updateListener.of((update) => {
					if (update.docChanged) {
						latest.current.onChange(update.state.doc.toString());
					}
				}),
				EditorView.domEventHandlers({
					paste(event) {
						const file = [...(event.clipboardData?.files ?? [])].find(isImage);
						if (!file || !latest.current.uploadImage) return false;
						event.preventDefault();
						void attach(file);
						return true;
					},
					drop(event) {
						const file = [...(event.dataTransfer?.files ?? [])].find(isImage);
						if (!file || !latest.current.uploadImage) return false;
						event.preventDefault();
						void attach(file);
						return true;
					},
				}),
			],
		});
		const created = new EditorView({ state, parent: host.current });
		view.current = created;
		return () => {
			created.destroy();
			view.current = null;
		};
	}, []);

	// The parent owns the text: follow it when it changes from outside (restore, reset).
	useEffect(() => {
		const current = view.current;
		if (current && current.state.doc.toString() !== value) {
			current.dispatch({
				changes: { from: 0, to: current.state.doc.length, insert: value },
			});
		}
	}, [value]);

	useEffect(() => {
		view.current?.dispatch({
			effects: compartments.current.theme.reconfigure(colors(dark)),
		});
	}, [dark]);

	useEffect(() => {
		view.current?.dispatch({
			effects: compartments.current.diff.reconfigure(diffExtension(original)),
		});
	}, [original]);

	useEffect(() => {
		view.current?.dispatch({
			effects: compartments.current.readOnly.reconfigure(
				EditorState.readOnly.of(readOnly),
			),
		});
	}, [readOnly]);

	return (
		<div className="flex min-w-0 flex-col overflow-hidden rounded-md border">
			{!readOnly && (
				<div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/50 p-1">
					{TOOLS.map((tool) => (
						<Button
							key={tool.name}
							type="button"
							variant="ghost"
							size="icon-xs"
							aria-label={tool.label}
							title={tool.label}
							onClick={() => {
								const target = view.current;
								if (!target) return;
								target.dispatch(tool.run(target.state));
								target.focus();
							}}
						>
							<Icon name={tool.name} />
						</Button>
					))}
					{uploadImage && (
						<>
							<Button
								type="button"
								variant="ghost"
								size="icon-xs"
								aria-label="Insérer une image"
								title="Insérer une image (ou collez / déposez-la)"
								disabled={uploading}
								onClick={() => fileInput.current?.click()}
							>
								{uploading ? <Spinner /> : <Icon name="image" />}
							</Button>
							<input
								ref={fileInput}
								type="file"
								accept="image/png,image/jpeg,image/gif,image/webp"
								className="hidden"
								onChange={(event) => {
									const file = event.target.files?.[0];
									event.target.value = "";
									if (file) void attach(file);
								}}
							/>
						</>
					)}
				</div>
			)}
			{error && (
				<p role="alert" className="px-2 py-1 text-destructive text-xs">
					{error}
				</p>
			)}
			<div ref={host} className="min-w-0" />
		</div>
	);
}
