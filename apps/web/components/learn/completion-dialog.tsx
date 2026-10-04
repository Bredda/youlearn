"use client";

import type { LearnerEnrollment } from "@youlearn/types";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { EnrollmentSummary } from "@/components/learn/enrollment-summary";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

/**
 * Opens when the enrollment ends while the learner is on the page (last chapter finished, final exam passed or
 * missed). It can only be left through "Terminer", which goes back to the course sheet: no Escape, no click outside.
 */
export function CompletionDialog({
	enrollment,
	courseId,
	courseName,
	certifying,
}: {
	enrollment: LearnerEnrollment;
	courseId: string;
	courseName: string;
	certifying: boolean;
}) {
	const router = useRouter();
	const previous = useRef(enrollment.status);
	const [open, setOpen] = useState(false);

	useEffect(() => {
		if (
			previous.current === "in_progress" &&
			enrollment.status !== "in_progress"
		)
			setOpen(true);
		previous.current = enrollment.status;
	}, [enrollment.status]);

	if (!open) return null;
	const failed = enrollment.status === "failed";
	return (
		<Dialog
			open
			disablePointerDismissal
			onOpenChange={() => {
				// Ignored on purpose: only "Terminer" leaves the dialog.
			}}
		>
			<DialogContent showCloseButton={false}>
				<DialogHeader>
					<DialogTitle>
						{failed ? "Examen final non réussi" : "Cours terminé"}
					</DialogTitle>
					<DialogDescription>{courseName}</DialogDescription>
				</DialogHeader>
				<EnrollmentSummary enrollment={enrollment} certifying={certifying} />
				{failed && (
					<p className="text-muted-foreground text-sm">
						Vous pourrez recommencer le cours depuis sa fiche.
					</p>
				)}
				<DialogFooter>
					<Button onClick={() => router.push(`/courses/${courseId}`)}>
						<Icon name="confirm" /> Terminer
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
