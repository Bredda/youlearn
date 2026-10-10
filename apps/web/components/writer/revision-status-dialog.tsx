"use client";

import { countImpacts } from "@youlearn/content";
import type {
	ChangeImpact,
	PublishImpact,
	ReviewSummary,
	RevisionStatus,
} from "@youlearn/types";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { fetchApi } from "@/lib/api-client";
import { reviewWarnings } from "@/lib/review-summary";

const IMPACTS: { value: ChangeImpact; title: string; description: string }[] = [
	{
		value: "minor",
		title: "Mineur : correction ou ajustement",
		description:
			"Les apprenants en cours passent automatiquement à la nouvelle révision, sans rien refaire. Ils en sont simplement informés.",
	},
	{
		value: "major",
		title: "Majeur : contenu ou quiz modifiés",
		description:
			"Chaque apprenant en cours choisit de passer à la nouvelle révision : les chapitres modifiés sont alors à refaire. Sinon, il termine l'ancienne.",
	},
];

const plural = (n: number, one: string, many: string) =>
	`${n} ${n > 1 ? many : one}`;

/** A group of chapters of the change, under what happens to the learners who follow them. */
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
		<section className="flex min-w-0 flex-col gap-1 rounded-md border p-3">
			<h4 className="font-medium text-sm">
				{title} <span className="text-muted-foreground">({titles.length})</span>
			</h4>
			{hint && <p className="text-muted-foreground text-xs">{hint}</p>}
			<ul className="max-h-32 list-disc overflow-y-auto pl-5 text-sm">
				{titles.map((chapterTitle, index) => (
					// A title is not unique, and the list never changes while the dialog is open.
					// biome-ignore lint/suspicious/noArrayIndexKey: see above
					<li key={index}>{chapterTitle}</li>
				))}
			</ul>
		</section>
	);
}

/** What the writer needs to choose between minor and major: who is mid-course and what changes for them. */
function ImpactChoice({
	courseId,
	revisionId,
	replacedKey,
	value,
	onChange,
}: {
	courseId: string;
	revisionId: string;
	replacedKey: string;
	value: ChangeImpact | undefined;
	onChange: (value: ChangeImpact) => void;
}) {
	const [impact, setImpact] = useState<PublishImpact>();
	useEffect(() => {
		let current = true;
		fetchApi<PublishImpact>(
			"GET",
			`/api/writer/courses/${courseId}/revisions/${revisionId}/publish-impact`,
		).then((result) => {
			if (current && result.data) setImpact(result.data);
		});
		return () => {
			current = false;
		};
	}, [courseId, revisionId]);

	const chapters = (wanted: string) =>
		impact?.summary?.chapters
			.filter((chapter) => chapter.impact === wanted)
			.map((chapter) => chapter.title) ?? [];
	const counts = impact?.summary ? countImpacts(impact.summary) : null;
	const learners = impact?.learnersInProgress;

	return (
		<section className="flex flex-col gap-3">
			<div className="flex flex-col gap-1">
				<h3 className="font-medium text-sm">
					Impact sur les apprenants en cours
				</h3>
				{learners !== undefined && (
					<p className="text-sm">
						{learners === 0
							? "Aucun apprenant n'est en cours sur ce cours."
							: `${plural(learners, "apprenant est", "apprenants sont")} en cours sur ce cours.`}
					</p>
				)}
			</div>

			<RadioGroup
				value={value ?? ""}
				onValueChange={(next) => onChange(next as ChangeImpact)}
				className="grid gap-2 sm:grid-cols-2"
			>
				{IMPACTS.map((option) => (
					<Label
						key={option.value}
						htmlFor={`impact-${option.value}`}
						className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${
							value === option.value ? "border-primary bg-primary/5" : ""
						}`}
					>
						<RadioGroupItem
							id={`impact-${option.value}`}
							value={option.value}
							className="mt-0.5"
						/>
						<span className="flex flex-col gap-1">
							<span className="font-medium text-sm">{option.title}</span>
							<span className="font-normal text-muted-foreground text-xs">
								{option.description}
							</span>
						</span>
					</Label>
				))}
			</RadioGroup>

			{counts && (
				<div className="flex flex-col gap-2">
					<h3 className="font-medium text-sm">
						Changements par rapport à la révision « {replacedKey} »
					</h3>
					{counts.redo + counts.added + counts.removed === 0 ? (
						<p className="text-muted-foreground text-sm">
							Aucun chapitre n'est modifié, ajouté ou supprimé.
						</p>
					) : (
						<div className="grid gap-2 sm:grid-cols-2">
							<ChapterGroup
								title={
									value === "major"
										? "À refaire par les apprenants"
										: "Modifiés"
								}
								hint={
									value === "minor"
										? "Leur contenu ou leur quiz a changé : la progression est conservée."
										: "Leur contenu ou leur quiz a changé."
								}
								titles={chapters("redo")}
							/>
							<ChapterGroup
								title="Nouveaux chapitres"
								hint="À faire par tous, y compris ceux qui sont déjà en cours."
								titles={chapters("added")}
							/>
							<ChapterGroup title="Supprimés" titles={chapters("removed")} />
							<ChapterGroup
								title="Inchangés"
								hint="La progression est conservée."
								titles={chapters("kept")}
							/>
						</div>
					)}
				</div>
			)}
		</section>
	);
}

/**
 * Confirmation asked before a status change that retires a live revision: publishing over a published one
 * (`publishedKey`) or deprecating. Shared by the course page and the review page. Publishing over a published
 * revision also asks how much it matters to the learners already on it, and an unfinished review has to be waved
 * through explicitly.
 */
export function RevisionStatusDialog({
	courseId,
	revisionId,
	revisionKey,
	to,
	publishedKey,
	review,
	pending,
	onConfirm,
	onClose,
}: {
	courseId: string;
	revisionId: string;
	revisionKey: string;
	to: Extract<RevisionStatus, "published" | "deprecated">;
	/** Key of the revision that is published now, named when publishing replaces it. */
	publishedKey?: string | null | undefined;
	/** Where the review stands: what is still open is listed before publishing. */
	review?: ReviewSummary | null | undefined;
	pending: boolean;
	/** Receives the impact chosen when the publication replaces a published revision. */
	onConfirm: (changeImpact?: ChangeImpact) => void;
	onClose: () => void;
}) {
	const publishing = to === "published";
	const warnings = publishing ? reviewWarnings(review ?? null) : [];
	const [impact, setImpact] = useState<ChangeImpact>();
	const [acceptedWarnings, setAcceptedWarnings] = useState(false);
	// Publishing over a published revision must say how much it matters to the learners on it.
	const needsImpact = publishing && Boolean(publishedKey);
	const blocked =
		pending ||
		(needsImpact && !impact) ||
		(warnings.length > 0 && !acceptedWarnings);

	return (
		<AlertDialog open onOpenChange={(open) => !open && onClose()}>
			<AlertDialogContent className="max-h-[92svh] overflow-y-auto data-[size=default]:sm:max-w-2xl">
				<AlertDialogHeader>
					<AlertDialogTitle>
						{publishing
							? `Publier la révision « ${revisionKey} » ?`
							: `Déprécier la révision « ${revisionKey} » ?`}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{publishing
							? publishedKey
								? `La révision « ${publishedKey} » est actuellement publiée : elle va être dépréciée. Les nouveaux apprenants verront la révision « ${revisionKey} » ; ceux qui sont déjà en cours la verront selon l'impact choisi ci-dessous.`
								: "Les apprenants verront cette révision."
							: "Le cours ne sera plus accessible aux apprenants tant qu'une autre révision n'est pas publiée. La révision dépréciée reste consultable dans l'historique."}
					</AlertDialogDescription>
				</AlertDialogHeader>

				{warnings.length > 0 && (
					<section className="flex flex-col gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm">
						<h3 className="flex items-center gap-2 font-medium text-destructive">
							<Icon name="alert" /> La relecture n'est pas terminée
						</h3>
						<ul className="list-disc pl-5">
							{warnings.map((warning) => (
								<li key={warning}>{warning}</li>
							))}
						</ul>
						<Label className="flex items-center gap-2 font-medium">
							<Switch
								checked={acceptedWarnings}
								onCheckedChange={setAcceptedWarnings}
							/>
							Je publie malgré une relecture non terminée
						</Label>
					</section>
				)}

				{needsImpact && publishedKey && (
					<ImpactChoice
						courseId={courseId}
						revisionId={revisionId}
						replacedKey={publishedKey}
						value={impact}
						onChange={setImpact}
					/>
				)}

				<AlertDialogFooter>
					<AlertDialogCancel>Annuler</AlertDialogCancel>
					<AlertDialogAction
						variant={publishing ? "default" : "destructive"}
						onClick={() => onConfirm(impact)}
						disabled={blocked}
					>
						<Icon name="confirm" />
						Confirmer
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
