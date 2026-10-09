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

/** What the writer needs to choose between minor and major: who is mid-course and what a major change redoes. */
function ImpactChoice({
	courseId,
	revisionId,
	value,
	onChange,
}: {
	courseId: string;
	revisionId: string;
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

	const counts = impact?.summary ? countImpacts(impact.summary) : null;
	const redo = impact?.summary?.chapters.filter((c) => c.impact === "redo");
	return (
		<div className="flex flex-col gap-3 rounded-md border px-3 py-3 text-sm">
			<p className="font-medium">Quel est l'impact de cette publication ?</p>
			{impact && (
				<p className="text-muted-foreground">
					{impact.learnersInProgress === 0
						? "Aucun apprenant n'est en cours sur ce cours."
						: `${plural(impact.learnersInProgress, "apprenant est", "apprenants sont")} en cours sur ce cours.`}
				</p>
			)}
			<RadioGroup
				value={value ?? ""}
				onValueChange={(next) => onChange(next as ChangeImpact)}
			>
				{IMPACTS.map((option) => (
					<div key={option.value} className="flex items-start gap-2">
						<RadioGroupItem
							id={`impact-${option.value}`}
							value={option.value}
							className="mt-0.5"
						/>
						<Label
							htmlFor={`impact-${option.value}`}
							className="flex flex-col items-start gap-0.5"
						>
							<span>{option.title}</span>
							<span className="font-normal text-muted-foreground">
								{option.description}
							</span>
						</Label>
					</div>
				))}
			</RadioGroup>
			{counts && (
				<p className="text-muted-foreground">
					Par rapport à la révision publiée :{" "}
					{counts.redo > 0
						? `${plural(counts.redo, "chapitre modifié", "chapitres modifiés")} (${redo?.map((c) => `« ${c.title} »`).join(", ")})`
						: "aucun chapitre modifié"}
					, {plural(counts.added, "ajouté", "ajoutés")},{" "}
					{plural(counts.removed, "supprimé", "supprimés")}.
				</p>
			)}
		</div>
	);
}

/**
 * Confirmation asked before a status change that retires a live revision: publishing over a published one
 * (`publishedKey`) or deprecating. Shared by the course page and the review page.
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
	const [impact, setImpact] = useState<ChangeImpact>();
	// Publishing over a published revision must say how much it matters to the learners on it.
	const needsImpact = publishing && Boolean(publishedKey);
	const warnings = publishing ? reviewWarnings(review ?? null) : [];
	return (
		<AlertDialog open onOpenChange={(open) => !open && onClose()}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{publishing
							? `Publier la révision « ${revisionKey} » ?`
							: `Déprécier la révision « ${revisionKey} » ?`}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{publishing
							? publishedKey
								? `La révision « ${publishedKey} » est actuellement publiée : elle va être dépréciée. Les apprenants verront la nouvelle révision.`
								: "Les apprenants verront cette révision."
							: "Le cours ne sera plus accessible aux apprenants tant qu'une autre révision n'est pas publiée. La révision dépréciée reste consultable dans l'historique."}
					</AlertDialogDescription>
					{needsImpact && (
						<ImpactChoice
							courseId={courseId}
							revisionId={revisionId}
							value={impact}
							onChange={setImpact}
						/>
					)}
					{warnings.length > 0 && (
						<div className="rounded-md border border-dashed bg-muted/50 px-3 py-2 text-sm">
							<p className="font-medium">La relecture n'est pas terminée :</p>
							<ul className="list-disc pl-5">
								{warnings.map((warning) => (
									<li key={warning}>{warning}</li>
								))}
							</ul>
						</div>
					)}
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Annuler</AlertDialogCancel>
					<AlertDialogAction
						variant={publishing ? "default" : "destructive"}
						onClick={() => onConfirm(impact)}
						disabled={pending || (needsImpact && !impact)}
					>
						<Icon name="confirm" />
						Confirmer
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
