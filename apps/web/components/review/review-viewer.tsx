"use client";

import type { ReviewView } from "@youlearn/types";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { assetUrl, Markdown } from "@/components/writer/markdown";

/** Read-only view of the revision under review. */
export function ReviewViewer({ view }: { view: ReviewView }) {
	const { course, revision, content, token } = view;
	const [selectedId, setSelectedId] = useState(content.lessons[0]?.id);
	const lesson = content.lessons.find((l) => l.id === selectedId);

	return (
		<div className="flex flex-col gap-4">
			<div className="rounded-md border border-dashed bg-muted/50 px-3 py-2 text-sm">
				Relecture de la révision <strong>{revision.key}</strong> : ce contenu
				n'est pas encore publié.
			</div>

			<PageHeader
				title={course.name}
				description={course.description || undefined}
			/>
			{(course.imageAssetId || course.categories.length > 0) && (
				<div className="flex items-start gap-4">
					{course.imageAssetId && (
						// biome-ignore lint/performance/noImgElement: asset URLs are API routes, not optimizable by next/image
						<img
							src={assetUrl(course.id, course.imageAssetId, token)}
							alt=""
							className="h-24 w-40 rounded-md border object-cover"
						/>
					)}
					<div className="flex flex-wrap gap-1">
						{course.categories.map((category) => (
							<Badge key={category} variant="outline">
								{category}
							</Badge>
						))}
					</div>
				</div>
			)}

			{content.lessons.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Cette révision n'a pas encore de leçon.
				</p>
			) : (
				<div className="grid gap-4 md:grid-cols-[16rem_1fr]">
					<ol className="flex flex-col gap-1">
						{content.lessons.map((l, index) => (
							<li key={l.id}>
								<button
									type="button"
									onClick={() => setSelectedId(l.id)}
									className={`w-full truncate rounded-md border px-2 py-1 text-left text-sm ${
										l.id === selectedId ? "bg-muted" : ""
									}`}
								>
									{index + 1}. {l.title}
								</button>
							</li>
						))}
					</ol>
					{lesson && (
						<article className="min-w-0 rounded-md border p-4">
							<h2 className="mb-2 font-semibold text-lg">{lesson.title}</h2>
							<Markdown courseId={course.id} reviewToken={token}>
								{lesson.body}
							</Markdown>
						</article>
					)}
				</div>
			)}
		</div>
	);
}
