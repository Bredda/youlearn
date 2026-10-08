"use client";

import type { WriterRevision } from "@youlearn/types";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { REVISION_STATUS_LABELS } from "@/lib/revisions";

export const NO_COMPARISON = "none";

/**
 * Chooses the revision the one on screen is compared with (the badges of the outline, the differences inside the
 * text blocks and the list of changes all follow it), and, once there is one, a button summing up the changes that
 * switches the page between the editor and the list of changes.
 */
export function CompareControl({
	revisions,
	currentId,
	parentId,
	value,
	onChange,
	summary,
	showChanges,
	onToggleChanges,
}: {
	revisions: WriterRevision[];
	currentId: string;
	/** The revision this one was cloned from: the default base. */
	parentId: string | null;
	/** The revision compared with, or `NO_COMPARISON`. */
	value: string;
	onChange: (value: string) => void;
	/** What changed, shown in the button; null while nothing is compared. */
	summary: React.ReactNode | null;
	showChanges: boolean;
	onToggleChanges: () => void;
}) {
	const others = revisions.filter((r) => r.id !== currentId);
	if (others.length === 0) return null;

	const items = [
		{ value: NO_COMPARISON, label: "Aucune comparaison" },
		...others.map((revision) => ({
			value: revision.id,
			label: revision.key,
		})),
	];
	const current = others.find((r) => r.id === value);

	return (
		<>
			<Select
				value={value}
				items={items}
				onValueChange={(next) => next && onChange(next)}
			>
				<SelectTrigger
					aria-label="Révision à comparer"
					className="max-w-72 min-w-0"
				>
					<Icon name="compare" />
					<SelectValue>
						{() => (
							<span className="truncate">
								Comparer avec : {current ? current.key : "aucune"}
							</span>
						)}
					</SelectValue>
				</SelectTrigger>
				<SelectContent
					align="end"
					alignItemWithTrigger={false}
					className="w-96 max-w-[90vw]"
				>
					<SelectItem value={NO_COMPARISON}>Aucune comparaison</SelectItem>
					{others.map((revision) => (
						<SelectItem key={revision.id} value={revision.id}>
							<span className="flex min-w-0 flex-col">
								<span className="flex items-center gap-2">
									<span className="font-mono">{revision.key}</span>
									<span className="text-muted-foreground">
										{REVISION_STATUS_LABELS[revision.status].toLowerCase()}
										{revision.id === parentId && " · origine"}
									</span>
								</span>
								<span className="truncate text-muted-foreground">
									{revision.purpose}
								</span>
							</span>
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{summary && (
				<Button
					variant={showChanges ? "secondary" : "outline"}
					aria-pressed={showChanges}
					title={
						showChanges
							? "Revenir à l'éditeur"
							: "Afficher la liste des changements"
					}
					onClick={onToggleChanges}
				>
					{summary}
				</Button>
			)}
		</>
	);
}
