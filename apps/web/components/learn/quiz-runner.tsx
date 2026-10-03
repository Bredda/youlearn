"use client";

import type { LearnerQuiz } from "@youlearn/content";
import type {
	AttemptResult,
	AttemptSummary,
	LearnerAttempt,
} from "@youlearn/types";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "@/components/form-error";
import { Icon, PendingIcon } from "@/components/icon";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Markdown } from "@/components/writer/markdown";
import { fetchApi } from "@/lib/api-client";

type Answers = Record<string, string[]>;

/**
 * Plays the quiz of a chapter: the server draws the questions and grades the answers, the browser only shows
 * what it is given. A chapter quiz can be retried with a new draw and shows its correction; the final exam is a
 * single attempt and shows the score only.
 */
export function QuizRunner({
	enrollmentId,
	courseId,
	chapterId,
	quiz,
	finalExam,
	active,
	attempts,
}: {
	enrollmentId: string;
	courseId: string;
	chapterId: string;
	quiz: LearnerQuiz;
	finalExam: boolean;
	/** The enrollment is in progress: a finished one only shows its results. */
	active: boolean;
	/** The attempts at this chapter's quiz. */
	attempts: AttemptSummary[];
}) {
	const router = useRouter();
	const [attempt, setAttempt] = useState<LearnerAttempt | null>(null);
	const [answers, setAnswers] = useState<Answers>({});
	const [result, setResult] = useState<AttemptResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [pending, startTransition] = useTransition();

	const submitted = attempts.filter((a) => a.submittedAt !== null);
	const best = submitted.reduce<number | null>(
		(max, a) =>
			a.score !== null && (max === null || a.score > max) ? a.score : max,
		null,
	);
	const passed = submitted.some((a) => a.passed);
	const hasOpenAttempt = attempts.some((a) => a.submittedAt === null);

	function start() {
		setError(null);
		startTransition(async () => {
			const response = await fetchApi<{ attempt: LearnerAttempt }>(
				"POST",
				`/api/enrollments/${enrollmentId}/chapters/${chapterId}/attempts`,
			);
			if (response.data === null) return setError(response.error);
			setAttempt(response.data.attempt);
			setAnswers({});
			setResult(null);
		});
	}

	function submit() {
		if (!attempt) return;
		setError(null);
		startTransition(async () => {
			const response = await fetchApi<{ result: AttemptResult }>(
				"POST",
				`/api/enrollments/${enrollmentId}/attempts/${attempt.id}/submit`,
				{ answers },
			);
			if (response.data === null) return setError(response.error);
			setResult(response.data.result);
			router.refresh();
		});
	}

	function choose(questionId: string, optionId: string, multiple: boolean) {
		setAnswers((current) => {
			const chosen = current[questionId] ?? [];
			if (!multiple) return { ...current, [questionId]: [optionId] };
			return {
				...current,
				[questionId]: chosen.includes(optionId)
					? chosen.filter((id) => id !== optionId)
					: [...chosen, optionId],
			};
		});
	}

	const startButton = (label: string, confirm = false) =>
		confirm ? (
			<AlertDialog>
				<AlertDialogTrigger render={<Button disabled={pending} />}>
					<Icon name="start" /> {label}
				</AlertDialogTrigger>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Passer l'examen final ?</AlertDialogTitle>
						<AlertDialogDescription>
							Vous n'avez qu'une seule tentative. Si vous ne réunissez pas{" "}
							{quiz.passRate} % de bonnes réponses, le cours est considéré comme
							échoué et il faudra le recommencer depuis le début.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Pas maintenant</AlertDialogCancel>
						<AlertDialogAction onClick={start}>
							<Icon name="start" /> Commencer l'examen
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		) : (
			<Button onClick={start} disabled={pending}>
				<PendingIcon pending={pending} name="start" /> {label}
			</Button>
		);

	return (
		<section className="flex flex-col gap-3 rounded-md border p-3">
			<header className="flex flex-wrap items-center gap-2">
				<h3 className="flex items-center gap-1.5 font-semibold text-lg">
					<Icon name="quiz" /> {finalExam ? "Examen final" : "Quiz"}
				</h3>
				<Badge variant="outline">
					{quiz.drawCount} question{quiz.drawCount > 1 ? "s" : ""} sur{" "}
					{quiz.poolSize}
				</Badge>
				<Badge variant="outline">Réussite à {quiz.passRate} %</Badge>
				{!finalExam && quiz.blocking && (
					<Badge variant="outline">
						<Icon name="blocking" /> À réussir pour ouvrir la suite
					</Badge>
				)}
				{finalExam && <Badge variant="outline">Une seule tentative</Badge>}
			</header>

			{error && <FormError>{error}</FormError>}

			{attempt && !result && (
				<form
					className="flex flex-col gap-4"
					onSubmit={(event) => {
						event.preventDefault();
						submit();
					}}
				>
					<ol className="flex flex-col gap-3">
						{attempt.questions.map((question, index) => {
							const multiple = question.type === "multiple";
							const chosen = answers[question.id] ?? [];
							return (
								<li
									key={question.id}
									className="rounded-md border bg-muted/30 p-3"
								>
									<fieldset className="flex flex-col gap-2">
										<legend className="mb-1 flex items-center gap-2 text-muted-foreground text-xs">
											Question {index + 1}
											<Badge variant="outline">
												{multiple ? "Plusieurs réponses" : "Une seule réponse"}
											</Badge>
										</legend>
										<Markdown courseId={courseId}>{question.prompt}</Markdown>
										{multiple ? (
											question.options.map((option) => {
												const id = `${question.id}-${option.id}`;
												return (
													<div
														key={option.id}
														className="flex items-center gap-2"
													>
														<Checkbox
															id={id}
															checked={chosen.includes(option.id)}
															onCheckedChange={() =>
																choose(question.id, option.id, true)
															}
														/>
														<Label htmlFor={id}>{option.text}</Label>
													</div>
												);
											})
										) : (
											<RadioGroup
												className="gap-2"
												value={chosen[0] ?? ""}
												onValueChange={(value) =>
													choose(question.id, String(value), false)
												}
											>
												{question.options.map((option) => {
													const id = `${question.id}-${option.id}`;
													return (
														<div
															key={option.id}
															className="flex items-center gap-2"
														>
															<RadioGroupItem id={id} value={option.id} />
															<Label htmlFor={id}>{option.text}</Label>
														</div>
													);
												})}
											</RadioGroup>
										)}
									</fieldset>
								</li>
							);
						})}
					</ol>
					<Button type="submit" disabled={pending} className="self-start">
						<PendingIcon pending={pending} name="confirm" /> Valider mes
						réponses
					</Button>
				</form>
			)}

			{attempt && result && (
				<div className="flex flex-col gap-3">
					<p
						className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
							result.passed
								? "border-primary bg-primary/10"
								: "border-destructive bg-destructive/10"
						}`}
					>
						<Icon name={result.passed ? "done" : "alert"} />
						Score : {result.score} % ({result.passed ? "réussi" : "non réussi"},
						seuil {result.passRate} %).
					</p>
					{finalExam && (
						<p className="text-muted-foreground text-sm">
							{result.passed
								? "Vous avez réussi l'examen final."
								: "Vous n'avez pas réussi l'examen final. Le cours est à recommencer depuis le début."}
						</p>
					)}
					{result.corrections && (
						<ol className="flex flex-col gap-3">
							{attempt.questions.map((question, index) => {
								const correction = result.corrections?.find(
									(c) => c.questionId === question.id,
								);
								if (!correction) return null;
								return (
									<li
										key={question.id}
										className="rounded-md border bg-muted/30 p-3"
									>
										<div className="mb-1 flex items-center gap-2 text-muted-foreground text-xs">
											Question {index + 1}
											<Badge
												variant={correction.correct ? "secondary" : "outline"}
											>
												{correction.correct ? "Juste" : "Faux"}
											</Badge>
										</div>
										<Markdown courseId={courseId}>{question.prompt}</Markdown>
										<ul className="mt-2 flex flex-col gap-1">
											{question.options.map((option) => {
												const isRight = correction.correctOptionIds.includes(
													option.id,
												);
												const isChosen = correction.chosen.includes(option.id);
												return (
													<li
														key={option.id}
														className={`flex items-center gap-2 rounded-md border px-2 py-1 text-sm ${
															isRight
																? "border-primary bg-primary/10"
																: isChosen
																	? "border-destructive bg-destructive/10"
																	: ""
														}`}
													>
														{isRight ? (
															<Icon name="confirm" className="size-4" />
														) : isChosen ? (
															<Icon name="cancel" className="size-4" />
														) : (
															<span className="size-4" />
														)}
														<span>{option.text}</span>
														{isRight && (
															<span className="sr-only">Bonne réponse</span>
														)}
														{isChosen && (
															<span className="ml-auto text-muted-foreground text-xs">
																Votre réponse
															</span>
														)}
													</li>
												);
											})}
										</ul>
										{correction.explanation && (
											<div className="mt-2 border-l-2 pl-3 text-sm">
												<Markdown courseId={courseId}>
													{correction.explanation}
												</Markdown>
											</div>
										)}
									</li>
								);
							})}
						</ol>
					)}
					{!finalExam && active && (
						<Button onClick={start} disabled={pending} className="self-start">
							<PendingIcon pending={pending} name="retry" /> Nouvelle tentative
						</Button>
					)}
				</div>
			)}

			{!attempt && (
				<div className="flex flex-col gap-2">
					{submitted.length > 0 && (
						<p className="text-muted-foreground text-sm">
							{finalExam
								? `Examen passé : ${best ?? 0} %.`
								: `${submitted.length} tentative${submitted.length > 1 ? "s" : ""}, meilleur score ${best ?? 0} %${passed ? " (réussi)" : ""}.`}
						</p>
					)}
					{active &&
						(hasOpenAttempt
							? startButton(
									finalExam ? "Reprendre l'examen" : "Reprendre le quiz",
								)
							: finalExam
								? submitted.length === 0 &&
									startButton("Passer l'examen final", true)
								: startButton(
										submitted.length > 0
											? "Nouvelle tentative"
											: "Commencer le quiz",
									))}
				</div>
			)}
		</section>
	);
}
