"use client";

import type { ReviewerState } from "@youlearn/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FormError } from "@/components/form-error";
import { PendingIcon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { callApi } from "@/lib/api-client";
import { REVIEWER_STATE_LABELS } from "@/lib/review-summary";

/** The reviewer's opinion of the revision: validated, or changes requested. It can be changed until the review ends. */
export function VerdictBar({
	revisionId,
	state,
}: {
	revisionId: string;
	state: ReviewerState;
}) {
	const router = useRouter();
	const [pending, setPending] = useState<string>();
	const [error, setError] = useState<string | null>(null);

	async function give(verdict: "approved" | "changes_requested") {
		setPending(verdict);
		setError(null);
		const message = await callApi("PUT", `/api/reviews/${revisionId}/verdict`, {
			verdict,
		});
		setPending(undefined);
		if (message) return setError(message);
		router.refresh();
	}

	return (
		<div className="flex flex-col gap-2 rounded-md border px-3 py-2">
			<div className="flex flex-wrap items-center gap-2">
				<span className="font-medium text-sm">Votre avis</span>
				<Badge variant={state === "none" ? "secondary" : "outline"}>
					{REVIEWER_STATE_LABELS[state]}
				</Badge>
				{state === "stale" && (
					<span className="text-muted-foreground text-xs">
						La révision a été modifiée depuis : confirmez ou changez votre avis.
					</span>
				)}
				<span className="ml-auto flex flex-wrap gap-2">
					<Button
						variant={state === "approved" ? "default" : "outline"}
						disabled={pending !== undefined}
						onClick={() => give("approved")}
					>
						<PendingIcon pending={pending === "approved"} name="confirm" />
						Valider
					</Button>
					<Button
						variant={state === "changes_requested" ? "destructive" : "outline"}
						disabled={pending !== undefined}
						onClick={() => give("changes_requested")}
					>
						<PendingIcon
							pending={pending === "changes_requested"}
							name="alert"
						/>
						Demander des modifications
					</Button>
				</span>
			</div>
			{error && <FormError>{error}</FormError>}
		</div>
	);
}
