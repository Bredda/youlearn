"use client";

import { diffContent, formatDuration } from "@youlearn/content";
import type { ReviewThread, ReviewView } from "@youlearn/types";
import { useMemo, useState } from "react";
import { ChapterView } from "@/components/content/chapter-view";
import { DiffSummary, RevisionDiff } from "@/components/content/revision-diff";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import {
	Annotation,
	OpenRemarksBadge,
	RemarksProvider,
} from "@/components/review/review-threads";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { assetUrl } from "@/lib/asset-url";
import { REVISION_STATUS_LABELS } from "@/lib/revisions";

/** Read-only view of the revision a reviewer was asked to proofread, with the changes since its base behind a toggle. */
export function ReviewViewer({
	view,
	initialRemarks,
}: {
	view: ReviewView;
	initialRemarks: { threads: ReviewThread[]; canWrite: boolean };
}) {
	const { course, revision, content, base } = view;
	const [selectedId, setSelectedId] = useState(content.chapters[0]?.id);
	const [showChanges, setShowChanges] = useState(false);
	const chapter = content.chapters.find((c) => c.id === selectedId);
	const diff = useMemo(
		() => (base ? diffContent(base.content, content) : null),
		[base, content],
	);

	return (
		<RemarksProvider revisionId={revision.id} initial={initialRemarks}>
			<div className="flex flex-col gap-4">
				<div className="rounded-md border border-dashed bg-muted/50 px-3 py-2 text-sm">
					<p>
						Relecture de la révision <strong>{revision.key}</strong> : ce
						contenu n'est pas encore publié.
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
				<div className="flex flex-wrap items-center gap-2">
					<Badge variant="outline">
						<Icon name="duration" />
						{formatDuration(revision.durationMinutes) || "Durée non estimée"}
					</Badge>
					{revision.certifying && (
						<Badge variant="outline">
							<Icon name="certifying" /> Certifiant
						</Badge>
					)}
				</div>
				{(course.imageAssetId || course.categories.length > 0) && (
					<div className="flex items-start gap-4">
						{course.imageAssetId && (
							// biome-ignore lint/performance/noImgElement: asset URLs are API routes, not optimizable by next/image
							<img
								src={assetUrl(course.id, course.imageAssetId)}
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

				<section className="flex flex-col gap-1">
					<h2 className="font-medium text-sm">Remarques sur la révision</h2>
					<Annotation target={{ type: "revision" }} alwaysVisible />
				</section>

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
					<RevisionDiff diff={diff} courseId={course.id} />
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
										<span className="flex items-center gap-1">
											<span className="min-w-0 flex-1 truncate">
												{index + 1}. {c.title}
											</span>
											<OpenRemarksBadge chapterId={c.id} />
										</span>
									</button>
								</li>
							))}
						</ol>
						{chapter && (
							<ChapterView
								chapter={chapter}
								courseId={course.id}
								annotate={{
									chapter: (
										<Annotation
											target={{ type: "chapter", chapterId: chapter.id }}
											alwaysVisible
										/>
									),
									block: (itemId) => (
										<Annotation
											target={{ type: "block", chapterId: chapter.id, itemId }}
										/>
									),
									question: (itemId) => (
										<Annotation
											target={{
												type: "question",
												chapterId: chapter.id,
												itemId,
											}}
										/>
									),
								}}
							/>
						)}
					</div>
				)}
			</div>
		</RemarksProvider>
	);
}
