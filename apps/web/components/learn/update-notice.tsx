"use client";

import type { EnrollmentNotice } from "@youlearn/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "@/components/form-error";
import { Icon, PendingIcon } from "@/components/icon";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { callApi } from "@/lib/api-client";

/**
 * A minor publication moved the learner to a newer revision by itself: tell them, and keep telling them until they
 * acknowledge it (their progress is kept, so there is nothing to decide).
 */
export function UpdateNotice({
	enrollmentId,
	notice,
}: {
	enrollmentId: string;
	notice: EnrollmentNotice;
}) {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	function acknowledge() {
		setError(null);
		startTransition(async () => {
			const message = await callApi(
				"POST",
				`/api/enrollments/${enrollmentId}/notice/ack`,
			);
			if (message) return setError(message);
			router.refresh();
		});
	}

	return (
		<div className="flex flex-col gap-2">
			{error && <FormError>{error}</FormError>}
			<Alert>
				<Icon name="notifications" />
				<AlertTitle>Ce cours a été mis à jour</AlertTitle>
				<AlertDescription>
					<p>
						Vous êtes passé de la révision « {notice.fromRevisionKey} » à la
						révision « {notice.toRevisionKey} ». Votre progression est
						conservée.
					</p>
					<ul className="mt-1 flex flex-col gap-1">
						{notice.revisions.map((revision) => (
							<li key={revision.key}>
								<span className="font-medium">{revision.key}</span> :{" "}
								<span className="whitespace-pre-wrap">{revision.purpose}</span>
							</li>
						))}
					</ul>
					<Button
						className="mt-2"
						variant="outline"
						size="sm"
						onClick={acknowledge}
						disabled={pending}
					>
						<PendingIcon pending={pending} name="confirm" /> J'ai compris
					</Button>
				</AlertDescription>
			</Alert>
		</div>
	);
}
