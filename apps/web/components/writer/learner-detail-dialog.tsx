"use client";

import type { CourseEnrollment, CourseEnrollmentDetail } from "@youlearn/types";
import { useEffect, useState } from "react";
import { FormError } from "@/components/form-error";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { fetchApi } from "@/lib/api-client";
import {
	ENROLLMENT_STATUS_LABELS,
	ENROLLMENT_STATUS_VARIANTS,
} from "@/lib/enrollments";

const dateTime = new Intl.DateTimeFormat("fr-FR", {
	dateStyle: "short",
	timeStyle: "short",
	timeZone: "UTC",
});

// Mounted only while open, so it loads the detail each time.
export function LearnerDetailDialog({
	courseId,
	enrollment,
	onClose,
}: {
	courseId: string;
	enrollment: CourseEnrollment;
	onClose: () => void;
}) {
	const [detail, setDetail] = useState<CourseEnrollmentDetail>();
	const [error, setError] = useState<string>();

	useEffect(() => {
		let cancelled = false;
		fetchApi<CourseEnrollmentDetail>(
			"GET",
			`/api/writer/courses/${courseId}/enrollments/${enrollment.id}`,
		).then((response) => {
			if (cancelled) return;
			if (response.data === null) setError(response.error);
			else setDetail(response.data);
		});
		return () => {
			cancelled = true;
		};
	}, [courseId, enrollment.id]);

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>{enrollment.learner.name}</DialogTitle>
					<DialogDescription>
						{enrollment.learner.email} · révision {enrollment.revisionKey}
					</DialogDescription>
				</DialogHeader>
				<div className="flex flex-col gap-4">
					<Badge
						variant={ENROLLMENT_STATUS_VARIANTS[enrollment.status]}
						className="self-start"
					>
						{ENROLLMENT_STATUS_LABELS[enrollment.status]}
					</Badge>
					{error && <FormError>{error}</FormError>}
					{!detail && !error && (
						<p className="text-muted-foreground text-sm">Chargement…</p>
					)}
					{detail && (
						<>
							{(detail.moves.length > 0 || detail.outdated) && (
								<section className="flex flex-col gap-1">
									<h3 className="font-medium text-sm">Révisions suivies</h3>
									{detail.moves.length > 0 && (
										<ol className="flex flex-col gap-1 text-sm">
											{detail.moves.map((move) => (
												<li
													key={`${move.at}-${move.toRevisionKey}`}
													className="flex flex-wrap items-baseline gap-x-2"
												>
													<span className="font-medium">
														{move.fromRevisionKey} → {move.toRevisionKey}
													</span>
													<span className="text-muted-foreground text-xs">
														{dateTime.format(new Date(move.at))}
														{move.automatic === null
															? ""
															: move.automatic
																? " · automatique (publication mineure)"
																: " · choisi par l'apprenant"}
														{move.redone
															? ` · ${move.redone} chapitre${move.redone > 1 ? "s" : ""} à refaire`
															: ""}
													</span>
												</li>
											))}
										</ol>
									)}
									{detail.outdated && (
										<p className="text-muted-foreground text-sm">
											Une révision plus récente est publiée : l'apprenant est
											encore sur la révision {detail.revisionKey}.
										</p>
									)}
								</section>
							)}
							<section className="flex flex-col gap-1">
								<h3 className="font-medium text-sm">Chapitres</h3>
								<ol className="flex flex-col gap-1">
									{detail.chapters.map((chapter, index) => (
										<li
											key={chapter.id}
											className="flex items-center gap-2 text-sm"
										>
											{chapter.completed ? (
												<Icon name="done" className="size-4" />
											) : (
												<span className="size-4" />
											)}
											<span>
												{index + 1}. {chapter.title}
											</span>
											{chapter.kind === "final-exam" && (
												<Badge variant="outline">Examen final</Badge>
											)}
										</li>
									))}
								</ol>
							</section>
							<section className="flex flex-col gap-1">
								<h3 className="font-medium text-sm">Tentatives aux quiz</h3>
								{detail.attempts.length === 0 ? (
									<p className="text-muted-foreground text-sm">
										Aucune tentative.
									</p>
								) : (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Chapitre</TableHead>
												<TableHead>Début</TableHead>
												<TableHead>Score</TableHead>
												<TableHead>Résultat</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{detail.attempts.map((attempt) => (
												<TableRow key={attempt.id}>
													<TableCell>
														{attempt.chapterTitle}
														{attempt.finalExam && (
															<Badge variant="outline" className="ml-2">
																Examen final
															</Badge>
														)}
													</TableCell>
													<TableCell className="text-muted-foreground text-xs">
														{dateTime.format(new Date(attempt.startedAt))}
													</TableCell>
													<TableCell>
														{attempt.score === null
															? "—"
															: `${attempt.score} %`}
													</TableCell>
													<TableCell>
														{attempt.submittedAt === null
															? "En cours"
															: attempt.passed
																? "Réussi"
																: "Non réussi"}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								)}
							</section>
						</>
					)}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Fermer
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
