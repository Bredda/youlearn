"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { PendingIcon } from "@/components/icon";
import { useReadingReached } from "@/components/learn/reading-gate";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { callApi } from "@/lib/api-client";

/**
 * Marks the chapter as finished, then moves on to the next one (or refreshes when it was the last). Disabled until
 * the content has been read; the error is a toast since the button lives in the compact chapter bar.
 */
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
	const reached = useReadingReached();
	const [pending, startTransition] = useTransition();

	function complete() {
		startTransition(async () => {
			const message = await callApi(
				"POST",
				`/api/enrollments/${enrollmentId}/chapters/${chapterId}/complete`,
			);
			if (message) {
				toast.add({ type: "error", title: message });
				return;
			}
			if (nextHref) router.push(nextHref);
			router.refresh();
		});
	}

	return (
		<Button
			onClick={complete}
			disabled={pending || !reached}
			title={
				reached ? undefined : "Lisez le chapitre jusqu'en bas pour le terminer"
			}
		>
			<PendingIcon pending={pending} name="done" />
			Terminer le chapitre
		</Button>
	);
}
