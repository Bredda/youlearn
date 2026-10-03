"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";

/** Highlighted markup of a code block, or null while Shiki loads / when the language is unknown. */
async function highlight(code: string, lang: string): Promise<string | null> {
	// Loaded on demand: the highlighter and its grammars stay out of the pages that show no code.
	const { bundledLanguages, codeToHtml } = await import("shiki/bundle/web");
	if (!(lang in bundledLanguages)) return null;
	return codeToHtml(code, {
		lang,
		// Both themes are emitted as CSS variables, `globals.css` picks one with the `dark` class.
		themes: { light: "github-light", dark: "github-dark" },
		defaultColor: false,
	});
}

/** A fenced code block: syntax highlighting, language label and a copy button. */
export function CodeBlock({ code, lang }: { code: string; lang?: string }) {
	const [html, setHtml] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!lang) {
			setHtml(null);
			return;
		}
		let cancelled = false;
		highlight(code, lang)
			.then((result) => {
				if (!cancelled) setHtml(result);
			})
			.catch(() => {
				if (!cancelled) setHtml(null);
			});
		return () => {
			cancelled = true;
		};
	}, [code, lang]);

	useEffect(() => {
		if (!copied) return;
		const timer = setTimeout(() => setCopied(false), 2000);
		return () => clearTimeout(timer);
	}, [copied]);

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
		} catch {
			// Clipboard blocked (insecure context, permissions): nothing to tell the reader that would help.
		}
	};

	return (
		<div className="group relative my-2 overflow-hidden rounded-md border bg-muted">
			<div className="flex items-center justify-between border-b px-3 py-1 text-muted-foreground text-xs">
				<span className="font-mono">{lang ?? "texte"}</span>
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					aria-label={copied ? "Code copié" : "Copier le code"}
					onClick={copy}
				>
					<Icon name={copied ? "copied" : "copy"} />
				</Button>
			</div>
			{html ? (
				<div
					className="code-block overflow-x-auto text-xs [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:p-3"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: Shiki escapes the code it highlights, the markup is its own
					dangerouslySetInnerHTML={{ __html: html }}
				/>
			) : (
				<pre className="overflow-x-auto p-3 text-xs">
					<code className="font-mono">{code}</code>
				</pre>
			)}
		</div>
	);
}
