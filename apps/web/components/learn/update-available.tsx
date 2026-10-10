"use client";

import { countImpacts } from "@youlearn/content";
import type {
	EnrollmentUpdate,
	LearnerEnrollment,
	UpdateOffer,
	UpdateRevision,
} from "@youlearn/types";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { FormError } from "@/components/form-error";
import { Icon, PendingIcon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { callApi, fetchApi } from "@/lib/api-client";

const plural = (n: number, one: string, many: string) =>
	`${n} ${n > 1 ? many : one}`;

/**
 * The revisions published since the learner's, in order: several can have come while they were away, and each says
 * why it exists and whether it was a correction or a change that matters.
 */
export function RevisionList({ revisions }: { revisions: UpdateRevision[] }) {
	return (
		<section className="flex flex-col gap-1">
			<h3 className="font-medium text-sm">
				{revisions.length > 1
					? `${revisions.length} révisions depuis la vôtre`
					: "Cette révision"}
			</h3>
			<ol className="flex flex-col gap-2">
				{revisions.map((revision) => (
					<li key={revision.key} className="rounded-md border p-2 text-sm">
						<div className="flex flex-wrap items-center gap-2">
							<span className="font-medium">{revision.key}</span>
							{revision.impact && (
								<Badge
									variant={revision.impact === "major" ? "default" : "outline"}
								>
									{revision.impact === "major" ? "Majeure" : "Mineure"}
								</Badge>
							)}
						</div>
						<p className="whitespace-pre-wrap text-muted-foreground">
							{revision.purpose}
						</p>
					</li>
				))}
			</ol>
		</section>
	);
}

/** A group of chapters of the update, under what happens to them. */
function ChapterGroup({
	title,
	hint,
	titles,
}: {
	title: string;
	hint?: string;
	titles: string[];
}) {
	if (titles.length === 0) return null;
	return (
		<section className="flex flex-col gap-1">
			<h3 className="font-medium text-sm">
				{title} ({titles.length})
			</h3>
			{hint && <p className="text-muted-foreground text-xs">{hint}</p>}
			<ul className="list-disc pl-5 text-sm">
				{titles.map((chapterTitle, index) => (
					// A title is not unique, and the list never changes while the dialog is open.
					// biome-ignore lint/suspicious/noArrayIndexKey: see above
					<li key={index}>{chapterTitle}</li>
				))}
			</ul>
		</section>
	);
}

/**
 * The choice of moving to the revision published now: what it is for, what is kept and what is redone. "Plus tard"
 * (and closing the dialog, which means the same) only puts it off: the learner can open it again from the button.
 */
export function UpdateDialog({
	enrollmentId,
	onClose,
}: {
	enrollmentId: string;
	onClose: () => void;
}) {
	const router = useRouter();
	const [update, setUpdate] = useState<EnrollmentUpdate | null>();
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	useEffect(() => {
		let current = true;
		fetchApi<{ update: EnrollmentUpdate | null }>(
			"GET",
			`/api/enrollments/${enrollmentId}/update`,
		).then((result) => {
			if (!current) return;
			if (result.data === null) setError(result.error);
			else setUpdate(result.data.update);
		});
		return () => {
			current = false;
		};
	}, [enrollmentId]);

	function later() {
		startTransition(async () => {
			// Refused when there is nothing left to postpone (it was moved meanwhile): the refresh shows the truth.
			await callApi("POST", `/api/enrollments/${enrollmentId}/update/postpone`);
			onClose();
			router.refresh();
		});
	}

	function migrate() {
		setError(null);
		startTransition(async () => {
			const result = await fetchApi<{ enrollment: LearnerEnrollment }>(
				"POST",
				`/api/enrollments/${enrollmentId}/migrate`,
			);
			if (result.data === null) return setError(result.error);
			onClose();
			router.push(`/learn/${result.data.enrollment.id}`);
		});
	}

	const chapters = (impact: string) =>
		update?.summary.chapters
			.filter((chapter) => chapter.impact === impact)
			.map((chapter) => chapter.title) ?? [];
	const counts = update ? countImpacts(update.summary) : null;

	return (
		<Dialog open onOpenChange={(open) => !open && !pending && later()}>
			<DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>
						Une nouvelle version du cours est disponible
					</DialogTitle>
					<DialogDescription>
						{update
							? `Vous passeriez sur la révision « ${update.targetRevisionKey} »`
							: "Chargement…"}
					</DialogDescription>
				</DialogHeader>

				{error && <FormError>{error}</FormError>}
				{update === null && !error && (
					<p className="text-sm">
						Il n'y a plus de mise à jour à proposer : votre cours est à jour.
					</p>
				)}
				{update && counts && (
					<div className="flex flex-col gap-3">
						<RevisionList revisions={update.revisions} />
						<p className="rounded-md border border-dashed bg-muted/50 px-3 py-2 text-sm">
							{update.level === "minor"
								? "Mise à jour mineure : votre progression est conservée."
								: counts.redo > 0
									? `${plural(counts.redo, "chapitre est à refaire", "chapitres sont à refaire")}, le reste de votre progression est conservé. Si vous préférez, vous pouvez terminer la version que vous suivez.`
									: "Votre progression est conservée. Si vous préférez, vous pouvez terminer la version que vous suivez."}
						</p>
						<div className="flex max-h-64 flex-col gap-3 overflow-y-auto">
							<ChapterGroup
								title="À refaire"
								hint="Leur contenu ou leur quiz a changé."
								titles={chapters("redo")}
							/>
							<ChapterGroup
								title="Nouveaux chapitres"
								titles={chapters("added")}
							/>
							<ChapterGroup
								title="Chapitres retirés"
								titles={chapters("removed")}
							/>
							<ChapterGroup
								title="Conservés"
								hint="Ce que vous avez fait reste acquis."
								titles={chapters("kept")}
							/>
						</div>
					</div>
				)}

				<DialogFooter>
					<Button variant="outline" onClick={later} disabled={pending}>
						Plus tard
					</Button>
					<Button onClick={migrate} disabled={pending || !update}>
						<PendingIcon pending={pending} name="refresh" />
						Passer à la nouvelle version
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/**
 * The visible way to the update of an enrollment in progress. With `autoOpen` the dialog opens by itself, once: the
 * server remembers that the learner put it off (`update.postponed`), so it does not come back on the next visit, and
 * a newer revision brings it back. The button is always there to open it again.
 */
export function UpdateAvailable({
	enrollmentId,
	update,
	autoOpen = false,
	size = "default",
}: {
	enrollmentId: string;
	update: UpdateOffer;
	autoOpen?: boolean;
	size?: "default" | "sm";
}) {
	const [open, setOpen] = useState(autoOpen && !update.postponed);
	return (
		<>
			{/* Always the primary button: putting it off must not make the way back easy to miss. */}
			<Button size={size} className="self-start" onClick={() => setOpen(true)}>
				<Icon name="refresh" /> Nouvelle version disponible
			</Button>
			{open && (
				<UpdateDialog
					enrollmentId={enrollmentId}
					onClose={() => setOpen(false)}
				/>
			)}
		</>
	);
}
