"use client";

import ReactMarkdown, { defaultUrlTransform } from "react-markdown";

/** Lessons refer to uploaded files as `asset:<id>`: they are served by the API, checked against the course's groups. */
export const assetUrl = (
	courseId: string,
	assetId: string,
	/** Token of a review link: lets a reader without access to the course load the files of the revision. */
	reviewToken?: string,
) =>
	`/api/courses/${courseId}/assets/${assetId}${
		reviewToken ? `?review=${encodeURIComponent(reviewToken)}` : ""
	}`;

/**
 * Renders the markdown of a lesson. react-markdown does not render raw HTML, so lesson authors cannot inject
 * scripts; links and images go through `urlTransform`, which only adds the `asset:` scheme to the safe ones.
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
				a: (props) => (
					<a
						className="text-primary underline"
						rel="noreferrer noopener"
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
				pre: (props) => (
					<pre
						className="my-2 overflow-x-auto rounded bg-muted p-3 text-xs [&>code]:bg-transparent [&>code]:p-0"
						{...props}
					/>
				),
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
