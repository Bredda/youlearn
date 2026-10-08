"use client";

import type { WriterRevision } from "@youlearn/types";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	REVISION_STATUS_LABELS,
	REVISION_STATUS_VARIANTS,
} from "@/lib/revisions";

/**
 * Next to the name of the revision being edited: opens the revisions of the course, with their status, to open
 * another one in its place. The current one is ticked.
 */
export function RevisionSwitcher({
	courseId,
	revisions,
	currentId,
}: {
	courseId: string;
	revisions: WriterRevision[];
	currentId: string;
}) {
	const [open, setOpen] = useState(false);
	// Most recently modified first, whatever the order the API returns.
	const sorted = [...revisions].sort((a, b) =>
		b.updatedAt.localeCompare(a.updatedAt),
	);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label="Changer de révision"
					/>
				}
			>
				<Icon name="switchItem" />
			</PopoverTrigger>
			<PopoverContent align="start" className="w-80 gap-1">
				<p className="px-1.5 py-1 font-medium text-muted-foreground text-xs">
					Révisions du cours
				</p>
				<ul className="flex max-h-72 flex-col overflow-y-auto">
					{sorted.map((revision) => {
						const current = revision.id === currentId;
						return (
							<li key={revision.id}>
								<Link
									href={`/writer/courses/${courseId}/revisions/${revision.id}`}
									aria-current={current ? "true" : undefined}
									onClick={() => setOpen(false)}
									className="flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-muted aria-[current=true]:bg-muted/60"
								>
									<span className="flex size-4 shrink-0 items-center justify-center">
										{current && <Icon name="confirm" className="size-4" />}
									</span>
									<span className="min-w-0 flex-1 truncate font-mono">
										{revision.key}
									</span>
									<Badge variant={REVISION_STATUS_VARIANTS[revision.status]}>
										{REVISION_STATUS_LABELS[revision.status]}
									</Badge>
								</Link>
							</li>
						);
					})}
				</ul>
			</PopoverContent>
		</Popover>
	);
}
