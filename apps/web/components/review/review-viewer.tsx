"use client";

import { diffContent } from "@youlearn/content";
import type { ReviewView } from "@youlearn/types";
import { useMemo, useState } from "react";
import { ChapterView } from "@/components/content/chapter-view";
import { DiffSummary, RevisionDiff } from "@/components/content/revision-diff";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { assetUrl } from "@/lib/asset-url";
import { REVISION_STATUS_LABELS } from "@/lib/revisions";

/** Read-only view of the revision under review, with the changes since its base hidden behind a toggle. */
export function ReviewViewer({ view }: { view: ReviewView }) {
	const { course, revision, content, base, token } = view;
	const [selectedId, setSelectedId] = useState(content.chapters[0]?.id);
	const [showChanges, setShowChanges] = useState(false);
	const chapter = content.chapters.find((c) => c.id === selectedId);
	const diff = useMemo(
		() => (base ? diffContent(base.content, content) : null),
		[base, content],
	);

	return (
		<div className="flex flex-col gap-4">
			<div className="rounded-md border border-dashed bg-muted/50 px-3 py-2 text-sm">
				<p>
					Relecture de la révision <strong>{revision.key}</strong> : ce contenu
					n'est pas encore publié.
				</p>
				<p className="mt-1 whitespace-pre-wrap text-muted-foreground">
					<span className="font-medium text-foreground">But : </span>
					{revision.purpose}
				</p>
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

			{base && diff && (
				<div className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2">
					<Switch
						id="show-changes"
						checked={showChanges}
						onCheckedChange={setShowChanges}
					/>
					<Label htmlFor="show-changes">
						Voir les modifications depuis {base.key} (
						{REVISION_STATUS_LABELS[base.status].toLowerCase()})
					</Label>
					<span className="ml-auto text-muted-foreground text-sm">
						<DiffSummary diff={diff} />
					</span>
				</div>
			)}

			{showChanges && diff ? (
				<RevisionDiff diff={diff} courseId={course.id} reviewToken={token} />
			) : content.chapters.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					Cette révision n'a pas encore de chapitre.
				</p>
			) : (
				<div className="grid gap-4 md:grid-cols-[16rem_1fr]">
					<ol className="flex flex-col gap-1">
						{content.chapters.map((c, index) => (
							<li key={c.id}>
								<button
									type="button"
									onClick={() => setSelectedId(c.id)}
									className={`w-full truncate rounded-md border px-2 py-1 text-left text-sm ${
										c.id === selectedId ? "bg-muted" : ""
									}`}
								>
									{index + 1}. {c.title}
								</button>
							</li>
						))}
					</ol>
					{chapter && (
						<ChapterView
							chapter={chapter}
							courseId={course.id}
							reviewToken={token}
						/>
					)}
				</div>
			)}
		</div>
	);
}
