"use client";

import type { LearnerEnrollment } from "@youlearn/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "@/components/form-error";
import { PendingIcon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { fetchApi } from "@/lib/api-client";

/** Enrolls the learner on the published revision, then opens the player. Also starts over after a failure. */
export function EnrollButton({
	courseId,
	restart = false,
}: {
	courseId: string;
	restart?: boolean;
}) {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	function enroll() {
		setError(null);
		startTransition(async () => {
			const result = await fetchApi<{ enrollment: LearnerEnrollment }>(
				"POST",
				`/api/courses/${courseId}/enroll`,
			);
			if (result.data === null) return setError(result.error);
			router.push(`/learn/${result.data.enrollment.id}`);
		});
	}

	return (
		<div className="flex flex-col gap-2">
			{error && <FormError>{error}</FormError>}
			<Button onClick={enroll} disabled={pending}>
				<PendingIcon pending={pending} name={restart ? "retry" : "start"} />
				{restart ? "Recommencer le cours" : "Commencer le cours"}
			</Button>
		</div>
	);
}
