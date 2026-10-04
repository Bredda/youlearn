"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "@/components/form-error";
import { PendingIcon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { callApi } from "@/lib/api-client";

/** Marks the chapter as finished, then moves on to the next one (or refreshes when it was the last). */
export function CompleteChapterButton({
	enrollmentId,
	chapterId,
	nextHref,
}: {
	enrollmentId: string;
	chapterId: string;
	nextHref?: string;
}) {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	function complete() {
		setError(null);
		startTransition(async () => {
			const message = await callApi(
				"POST",
				`/api/enrollments/${enrollmentId}/chapters/${chapterId}/complete`,
			);
			if (message) return setError(message);
			if (nextHref) router.push(nextHref);
			router.refresh();
		});
	}

	return (
		<div className="flex flex-col gap-2">
			{error && <FormError>{error}</FormError>}
			<Button onClick={complete} disabled={pending} className="self-start">
				<PendingIcon pending={pending} name="done" />
				Terminer le chapitre
			</Button>
		</div>
	);
}
