"use client";

import type { WriterCourse, WriterRevision } from "@youlearn/types";
import { FormError } from "@/components/form-error";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { RevisionCard } from "@/components/writer/revision-card";
import { useRevisionActions } from "@/components/writer/use-revision-actions";

/**
 * The first tab of a course: the revision learners follow (published) and the one being worked on or reviewed
 * (draft or review), in that order. A course has at most one of each.
 */
export function CurrentRevisions({
	course,
	revisions,
	suggestedKey,
}: {
	course: WriterCourse;
	revisions: WriterRevision[];
	suggestedKey: string;
}) {
	const { onAction, pending, error, startCreating, dialogs } =
		useRevisionActions({ course, revisions, suggestedKey });
	const published = revisions.find((r) => r.status === "published");
	const open = revisions.find(
		(r) => r.status === "draft" || r.status === "preview",
	);

	return (
		<div className="flex flex-col gap-4">
			{error && <FormError>{error}</FormError>}

			{published ? (
				<RevisionCard
					courseId={course.id}
					revision={published}
					hasOpen={open !== undefined}
					pending={pending}
					onAction={onAction}
				/>
			) : (
				<p className="rounded-md border border-dashed px-4 py-6 text-center text-muted-foreground text-sm">
					Aucune révision publiée : les apprenants ne voient pas encore ce
					cours.
				</p>
			)}

			{open ? (
				<RevisionCard
					courseId={course.id}
					revision={open}
					hasOpen
					pending={pending}
					onAction={onAction}
				/>
			) : (
				<div className="flex flex-col items-center gap-3 rounded-md border border-dashed px-4 py-6 text-center">
					<p className="text-muted-foreground text-sm">
						Aucune révision en cours.{" "}
						{published
							? "Pour corriger le cours, créez une nouvelle révision (le plus simple : cloner la révision publiée)."
							: "Créez une première révision pour rédiger le cours."}
					</p>
					<Button onClick={startCreating}>
						<Icon name="add" />
						Nouvelle révision
					</Button>
				</div>
			)}

			{dialogs}
		</div>
	);
}
