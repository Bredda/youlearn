"use client";

import type { CourseContent, ReviewThread } from "@youlearn/types";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { ThreadCard, useRemarks } from "@/components/review/review-threads";
import { Button } from "@/components/ui/button";
import { describeElement, openThreads } from "@/lib/review-targets";

type Group = {
	key: string;
	title: string;
	chapterId?: string;
	items: ReviewThread[];
};

/** Threads grouped for the writer: the revision as a whole, each chapter in order, then what was deleted. */
function groupThreads(content: CourseContent, threads: ReviewThread[]) {
	const groups: Group[] = [];
	const general = threads.filter((t) => t.target.type === "revision");
	if (general.length > 0)
		groups.push({ key: "revision", title: "Révision entière", items: general });
	content.chapters.forEach((chapter, index) => {
		const items = threads.filter(
			(t) =>
				!t.orphaned &&
				t.target.type !== "revision" &&
				t.target.chapterId === chapter.id,
		);
		if (items.length > 0)
			groups.push({
				key: chapter.id,
				chapterId: chapter.id,
				title: `Chapitre ${index + 1} · ${chapter.title || "(sans titre)"}`,
				items,
			});
	});
	const orphaned = threads.filter((t) => t.orphaned);
	if (orphaned.length > 0)
		groups.push({
			key: "orphaned",
			title: "Éléments supprimés",
			items: orphaned,
		});
	return groups;
}

/**
 * The remarks of the reviewers, for the writer who fixes the revision: grouped by chapter, with a shortcut to the
 * chapter and the remarks on deleted elements kept apart so none gets lost.
 */
export function RemarksPanel({
	content,
	onSelectChapter,
}: {
	content: CourseContent;
	onSelectChapter: (chapterId: string) => void;
}) {
	const { threads } = useRemarks();
	const open = openThreads(threads).length;
	const [expanded, setExpanded] = useState(open > 0);
	if (threads.length === 0) return null;

	return (
		<section className="flex flex-col gap-3 rounded-md border px-3 py-2">
			<div className="flex flex-wrap items-center gap-2">
				<h2 className="flex items-center gap-1.5 font-medium text-sm">
					<Icon name="remark" /> Remarques de relecture
				</h2>
				<span className="text-muted-foreground text-sm">
					{open} ouverte{open > 1 ? "s" : ""} sur {threads.length}
				</span>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="ml-auto"
					onClick={() => setExpanded((value) => !value)}
				>
					<Icon name="expand" />
					{expanded ? "Masquer" : "Afficher"}
				</Button>
			</div>
			{expanded &&
				groupThreads(content, threads).map((group) => (
					<div key={group.key} className="flex flex-col gap-2">
						<div className="flex items-center gap-2">
							<h3 className="font-medium text-sm">{group.title}</h3>
							{group.chapterId && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => {
										const chapterId = group.chapterId;
										if (chapterId) onSelectChapter(chapterId);
									}}
								>
									<Icon name="open" /> Aller au chapitre
								</Button>
							)}
						</div>
						{group.items.map((thread) => (
							<ThreadCard
								key={thread.id}
								thread={thread}
								where={describeElement(content, thread.target)}
							/>
						))}
					</div>
				))}
		</section>
	);
}
