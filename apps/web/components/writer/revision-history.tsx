"use client";

import { formatDuration } from "@youlearn/content";
import type { WriterCourse, WriterRevision } from "@youlearn/types";
import Link from "next/link";
import { FormError } from "@/components/form-error";
import { Icon } from "@/components/icon";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { RevisionRowActions } from "@/components/writer/revision-row-actions";
import { useRevisionActions } from "@/components/writer/use-revision-actions";

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
	dateStyle: "medium",
	timeStyle: "short",
});

/**
 * The third tab of a course: the revisions that were published and then replaced. They never change; restoring
 * one means cloning it into a new draft. `revisions` is the whole list (the form needs it), only the deprecated
 * ones are shown.
 */
export function RevisionHistory({
	course,
	revisions,
	suggestedKey,
}: {
	course: WriterCourse;
	revisions: WriterRevision[];
	suggestedKey: string;
}) {
	const { onAction, pending, error, open, dialogs } = useRevisionActions({
		course,
		revisions,
		suggestedKey,
	});
	// Most recently modified first, whatever the order the API returns.
	const old = revisions
		.filter((r) => r.status === "deprecated")
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

	return (
		<div className="flex flex-col gap-4">
			{error && <FormError>{error}</FormError>}

			<Table className="table-fixed">
				<TableHeader>
					<TableRow>
						<TableHead>Révision</TableHead>
						<TableHead className="w-28">Durée</TableHead>
						<TableHead>But</TableHead>
						<TableHead>Contributeurs</TableHead>
						<TableHead className="w-44">Dépréciée le</TableHead>
						<TableHead className="w-16 text-right">
							<span className="sr-only">Actions</span>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{old.length === 0 && (
						<TableRow>
							<TableCell
								colSpan={6}
								className="h-24 text-center text-muted-foreground"
							>
								Aucune révision dépréciée : une révision arrive ici quand une
								autre la remplace.
							</TableCell>
						</TableRow>
					)}
					{old.map((revision) => (
						<TableRow key={revision.id}>
							<TableCell className="truncate font-medium">
								<Link
									href={`/writer/courses/${course.id}/revisions/${revision.id}`}
									className="font-mono hover:underline"
									title={`Voir la révision ${revision.key}`}
								>
									{revision.key}
								</Link>
							</TableCell>
							<TableCell className="text-muted-foreground">
								<span className="flex items-center gap-1.5">
									{formatDuration(revision.durationMinutes) || "—"}
									{revision.certifying && (
										<Icon
											name="certifying"
											className="size-4"
											aria-label="Certifiant"
										/>
									)}
								</span>
							</TableCell>
							<TableCell
								className="truncate text-muted-foreground"
								title={revision.purpose}
							>
								{revision.purpose}
							</TableCell>
							<TableCell className="truncate text-muted-foreground">
								{revision.contributors.map((c) => c.name).join(", ")}
							</TableCell>
							<TableCell className="text-muted-foreground">
								{dateFormat.format(new Date(revision.updatedAt))}
							</TableCell>
							<TableCell className="text-right">
								<RevisionRowActions
									courseId={course.id}
									revision={revision}
									hasOpen={open !== undefined}
									pending={pending}
									onAction={onAction}
								/>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>

			{dialogs}
		</div>
	);
}
