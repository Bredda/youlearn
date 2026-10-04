"use client";

import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/content/code-block";
import { assetUrl } from "@/lib/asset-url";

/**
 * Renders the markdown of a chapter. react-markdown does not render raw HTML, so authors cannot inject
 * scripts; links and images go through `urlTransform`, which only adds the `asset:` scheme to the safe ones.
 * The same pipeline serves the editor preview, the review and the learner view.
 */
export function Markdown({
	courseId,
	reviewToken,
	children,
}: {
	courseId: string;
	reviewToken?: string;
	children: string;
}) {
	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm]}
			rehypePlugins={[rehypeSlug]}
			urlTransform={(url) =>
				url.startsWith("asset:")
					? assetUrl(courseId, url.slice("asset:".length), reviewToken)
					: defaultUrlTransform(url)
			}
			components={{
				h1: (props) => (
					<h1 className="mt-4 mb-2 font-semibold text-2xl" {...props} />
				),
				h2: (props) => (
					<h2 className="mt-4 mb-2 font-semibold text-xl" {...props} />
				),
				h3: (props) => (
					<h3 className="mt-3 mb-1 font-semibold text-lg" {...props} />
				),
				p: (props) => <p className="my-2 leading-relaxed" {...props} />,
				ul: (props) => <ul className="my-2 list-disc pl-6" {...props} />,
				ol: (props) => <ol className="my-2 list-decimal pl-6" {...props} />,
				// Links open in a new tab so the learner keeps their place; in-page anchors (#heading) stay put.
				a: (props) => (
					<a
						className="text-primary underline"
						rel="noreferrer noopener"
						target={props.href?.startsWith("#") ? undefined : "_blank"}
						{...props}
					/>
				),
				blockquote: (props) => (
					<blockquote
						className="my-2 border-l-2 pl-4 text-muted-foreground"
						{...props}
					/>
				),
				code: (props) => (
					<code
						className="rounded bg-muted px-1 py-0.5 font-mono text-xs"
						{...props}
					/>
				),
				// A fenced block arrives as <pre><code class="language-x">: hand its text to the highlighter.
				pre: ({ children }) => {
					const [code] = Children.toArray(children);
					if (
						isValidElement<{ className?: string; children?: ReactNode }>(code)
					) {
						const lang = /language-([\w+-]+)/.exec(
							code.props.className ?? "",
						)?.[1];
						const text = Children.toArray(code.props.children).join("");
						return <CodeBlock code={text.replace(/\n$/, "")} lang={lang} />;
					}
					return <pre>{children}</pre>;
				},
				table: (props) => (
					<div className="my-2 overflow-x-auto">
						<table className="w-full border-collapse text-sm" {...props} />
					</div>
				),
				th: (props) => (
					<th
						className="border bg-muted px-2 py-1 text-left font-medium"
						{...props}
					/>
				),
				td: (props) => <td className="border px-2 py-1" {...props} />,
				hr: (props) => <hr className="my-4" {...props} />,
				img: ({ alt, ...props }) => (
					// biome-ignore lint/performance/noImgElement: asset URLs are API routes, not optimizable by next/image
					<img alt={alt ?? ""} className="my-2 max-w-full rounded" {...props} />
				),
			}}
		>
			{children}
		</ReactMarkdown>
	);
}
