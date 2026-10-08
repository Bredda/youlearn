"use client";

import type {
	RevisionStatus,
	WriterCourse,
	WriterRevision,
} from "@youlearn/types";
import { FormError } from "@/components/form-error";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RevisionCard } from "@/components/writer/revision-card";
import { useRevisionActions } from "@/components/writer/use-revision-actions";
import {
	REVISION_STATUS_LABELS,
	REVISION_STATUS_VARIANTS,
} from "@/lib/revisions";

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
		<div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
			{error && <FormError>{error}</FormError>}

			<Section title="Actuellement publié">
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
			</Section>

			<Separator />

			<Section
				title="Révision en cours"
				status={open && <StatusBadge status={open.status} />}
			>
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
			</Section>

			{dialogs}
		</div>
	);
}

/** A labelled block of the tab. The tab is narrower than the page and centered so the two revisions read as two distinct things. */
function Section({
	title,
	status,
	children,
}: {
	title: string;
	/** The status badge shown after the title. */
	status?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<section className="flex flex-col gap-2">
			<h2 className="flex items-center gap-2 font-medium text-sm">
				{title}
				{status && (
					<>
						<span aria-hidden="true">-</span>
						{status}
					</>
				)}
			</h2>
			{children}
		</section>
	);
}

function StatusBadge({ status }: { status: RevisionStatus }) {
	return (
		<Badge variant={REVISION_STATUS_VARIANTS[status]}>
			{REVISION_STATUS_LABELS[status]}
		</Badge>
	);
}
