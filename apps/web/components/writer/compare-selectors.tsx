"use client";

import type { WriterRevision } from "@youlearn/types";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { REVISION_STATUS_LABELS } from "@/lib/revisions";

const clip = (text: string) =>
	text.length > 50 ? `${text.slice(0, 50)}…` : text;

/** Picks the two revisions to compare; the choice lives in the URL (`?from=&to=`). */
export function CompareSelectors({
	courseId,
	revisions,
	from,
	to,
}: {
	courseId: string;
	revisions: WriterRevision[];
	from: string | undefined;
	to: string;
}) {
	const router = useRouter();
	const items = revisions.map((revision) => ({
		value: revision.id,
		label: `${revision.key} · ${REVISION_STATUS_LABELS[revision.status].toLowerCase()} · ${clip(revision.purpose)}`,
	}));
	const go = (next: { from?: string | undefined; to: string }) => {
		const params = new URLSearchParams();
		if (next.from) params.set("from", next.from);
		params.set("to", next.to);
		router.push(`/writer/courses/${courseId}/compare?${params}`);
	};

	const picker = (
		id: string,
		label: string,
		value: string | undefined,
		onChange: (id: string) => void,
	) => (
		<div className="flex min-w-0 flex-1 flex-col gap-1.5">
			<Label htmlFor={id}>{label}</Label>
			<Select
				value={value ?? null}
				items={items}
				onValueChange={(next) => next && onChange(next)}
			>
				<SelectTrigger id={id} className="w-full">
					<SelectValue placeholder="Choisir une révision" />
				</SelectTrigger>
				<SelectContent>
					{items.map((item) => (
						<SelectItem key={item.value} value={item.value}>
							{item.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);

	return (
		<div className="flex flex-col gap-3 sm:flex-row">
			{picker("compare-from", "Base (avant)", from, (id) =>
				go({ from: id, to }),
			)}
			{picker("compare-to", "Révision (après)", to, (id) =>
				go({ from, to: id }),
			)}
		</div>
	);
}
