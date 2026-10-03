"use client";

import type { Question, Quiz } from "@youlearn/content";
import { QUIZ_LIMITS } from "@youlearn/content";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ConfirmRemove } from "@/components/writer/confirm-remove";
import { MarkdownField } from "@/components/writer/markdown-field";
import { DragHandle, SortableList } from "@/components/writer/sortable-list";
import { type EditAction, newQuestion } from "@/lib/content-editor";

const TYPES = [
	{ value: "single", label: "Choix unique" },
	{ value: "multiple", label: "Choix multiple" },
];

const firstLine = (text: string) => text.trim().split("\n")[0] ?? "";

function QuestionEditor({
	chapterId,
	question,
	courseId,
	dispatch,
}: {
	chapterId: string;
	question: Question;
	courseId: string;
	dispatch: (action: EditAction) => void;
}) {
	const questionId = question.id;
	const correctId = question.options.find((o) => o.correct)?.id ?? "";
	const optionRow = (option: Question["options"][number], index: number) => (
		<div key={option.id} className="flex items-center gap-2">
			{question.type === "single" ? (
				<RadioGroupItem
					value={option.id}
					aria-label={`Option ${index + 1} : bonne réponse`}
				/>
			) : (
				<Checkbox
					checked={option.correct}
					aria-label={`Option ${index + 1} : bonne réponse`}
					onCheckedChange={(correct) =>
						dispatch({
							type: "setCorrect",
							chapterId,
							questionId,
							optionId: option.id,
							correct,
						})
					}
				/>
			)}
			<Input
				value={option.text}
				placeholder={`Option ${index + 1}`}
				aria-label={`Texte de l'option ${index + 1}`}
				onChange={(e) =>
					dispatch({
						type: "updateOption",
						chapterId,
						questionId,
						optionId: option.id,
						text: e.target.value,
					})
				}
			/>
			<Button
				type="button"
				variant="ghost"
				size="icon-xs"
				aria-label={`Retirer l'option ${index + 1}`}
				title="Retirer l'option"
				disabled={question.options.length <= QUIZ_LIMITS.optionsMin}
				onClick={() =>
					dispatch({
						type: "removeOption",
						chapterId,
						questionId,
						optionId: option.id,
					})
				}
			>
				<Icon name="cancel" />
			</Button>
		</div>
	);

	return (
		<div className="flex flex-col gap-3 border-t p-3">
			<div className="flex items-center gap-2">
				<Label htmlFor={`type-${questionId}`}>Type</Label>
				<Select
					value={question.type}
					items={TYPES}
					onValueChange={(type) =>
						type &&
						dispatch({
							type: "updateQuestion",
							chapterId,
							questionId,
							patch: { type: type as Question["type"] },
						})
					}
				>
					<SelectTrigger id={`type-${questionId}`} className="w-44">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{TYPES.map((type) => (
							<SelectItem key={type.value} value={type.value}>
								{type.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<MarkdownField
				courseId={courseId}
				label="Énoncé de la question"
				value={question.prompt}
				onChange={(prompt) =>
					dispatch({
						type: "updateQuestion",
						chapterId,
						questionId,
						patch: { prompt },
					})
				}
			/>
			<fieldset className="flex flex-col gap-2">
				<legend className="mb-1 font-medium text-sm">
					Réponses{" "}
					<span className="font-normal text-muted-foreground">
						(cochez{" "}
						{question.type === "single"
							? "la bonne réponse"
							: "les bonnes réponses"}
						)
					</span>
				</legend>
				{question.type === "single" ? (
					<RadioGroup
						value={correctId}
						className="gap-2"
						onValueChange={(optionId) =>
							dispatch({
								type: "setCorrect",
								chapterId,
								questionId,
								optionId: String(optionId),
								correct: true,
							})
						}
					>
						{question.options.map(optionRow)}
					</RadioGroup>
				) : (
					<div className="flex flex-col gap-2">
						{question.options.map(optionRow)}
					</div>
				)}
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="w-fit"
					disabled={question.options.length >= QUIZ_LIMITS.optionsMax}
					onClick={() => dispatch({ type: "addOption", chapterId, questionId })}
				>
					<Icon name="add" />
					Ajouter une option
				</Button>
			</fieldset>
			<div className="flex flex-col gap-1">
				<span className="font-medium text-sm">
					Explication{" "}
					<span className="font-normal text-muted-foreground">
						(optionnelle, affichée après la réponse)
					</span>
				</span>
				<MarkdownField
					courseId={courseId}
					label="Explication de la réponse"
					value={question.explanation ?? ""}
					onChange={(explanation) =>
						dispatch({
							type: "updateQuestion",
							chapterId,
							questionId,
							patch: { explanation },
						})
					}
				/>
			</div>
		</div>
	);
}

/** The quiz that concludes a chapter: settings and a sortable pool of questions, one open at a time. */
export function QuizEditor({
	chapterId,
	quiz,
	courseId,
	exam = false,
	dispatch,
}: {
	chapterId: string;
	quiz: Quiz;
	courseId: string;
	/** The one-shot quiz of a final exam: always counted, nothing to lock, cannot be removed. */
	exam?: boolean;
	dispatch: (action: EditAction) => void;
}) {
	const [openId, setOpenId] = useState<string>();
	const pool = quiz.questions.length;

	return (
		<section className="flex flex-col gap-4 rounded-md border p-3">
			<header className="flex items-center justify-between">
				<h3 className="flex items-center gap-1.5 font-semibold text-lg">
					<Icon name="quiz" />{" "}
					{exam ? "Quiz de l'examen" : "Quiz de fin de chapitre"}
				</h3>
				{!exam && (
					<ConfirmRemove
						label="Supprimer le quiz"
						title="Supprimer le quiz ?"
						description="Ses questions seront perdues à l'enregistrement du brouillon."
						onConfirm={() => dispatch({ type: "removeQuiz", chapterId })}
					/>
				)}
			</header>

			<div
				className={`grid gap-3 ${exam ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}
			>
				{!exam && (
					<div className="flex flex-col gap-1.5">
						<div className="flex items-center gap-2">
							<Switch
								id={`blocking-${chapterId}`}
								checked={quiz.blocking}
								onCheckedChange={(blocking) =>
									dispatch({
										type: "updateQuiz",
										chapterId,
										patch: { blocking },
									})
								}
							/>
							<Label htmlFor={`blocking-${chapterId}`}>Quiz bloquant</Label>
						</div>
						<p className="text-muted-foreground text-xs">
							Bloque l'accès au chapitre suivant tant que le taux de réussite
							n'est pas atteint.
						</p>
					</div>
				)}
				<div className="flex flex-col gap-1.5">
					<Label htmlFor={`rate-${chapterId}`}>
						Taux de réussite requis (%)
					</Label>
					<Input
						id={`rate-${chapterId}`}
						type="number"
						min={1}
						max={100}
						disabled={!exam && !quiz.blocking}
						value={quiz.passRate}
						onChange={(e) => {
							const passRate = e.currentTarget.valueAsNumber;
							if (!Number.isNaN(passRate)) {
								dispatch({
									type: "updateQuiz",
									chapterId,
									patch: { passRate },
								});
							}
						}}
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor={`draw-${chapterId}`}>Questions tirées</Label>
					<div className="flex items-center gap-2">
						<Input
							id={`draw-${chapterId}`}
							type="number"
							min={1}
							max={pool}
							value={quiz.drawCount}
							onChange={(e) => {
								const drawCount = e.currentTarget.valueAsNumber;
								if (!Number.isNaN(drawCount)) {
									dispatch({
										type: "updateQuiz",
										chapterId,
										patch: { drawCount },
									});
								}
							}}
						/>
						<span className="whitespace-nowrap text-muted-foreground text-sm">
							sur {pool}
						</span>
					</div>
				</div>
			</div>

			<SortableList
				items={quiz.questions}
				className="flex flex-col gap-2"
				onMove={(from, to) =>
					dispatch({ type: "moveQuestion", chapterId, from, to })
				}
			>
				{(question, index, handleRef) => {
					const open = openId === question.id;
					return (
						<div className="rounded-md border bg-muted/30">
							<div className="flex items-center gap-2 p-2">
								<DragHandle
									handleRef={handleRef}
									label={`Déplacer la question ${index + 1}`}
								/>
								<button
									type="button"
									aria-expanded={open}
									className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
									onClick={() => setOpenId(open ? undefined : question.id)}
								>
									<span className="shrink-0 font-medium">
										Question {index + 1}
									</span>
									<Badge variant="outline">
										{question.type === "single" ? "Unique" : "Multiple"}
									</Badge>
									<span className="truncate text-muted-foreground">
										{firstLine(question.prompt) || "(sans énoncé)"}
									</span>
								</button>
								<ConfirmRemove
									label={`Supprimer la question ${index + 1}`}
									title="Supprimer la question ?"
									description="Elle sera retirée du pool du quiz."
									onConfirm={() =>
										dispatch({
											type: "removeQuestion",
											chapterId,
											questionId: question.id,
										})
									}
								/>
							</div>
							{open && (
								<QuestionEditor
									chapterId={chapterId}
									question={question}
									courseId={courseId}
									dispatch={dispatch}
								/>
							)}
						</div>
					);
				}}
			</SortableList>

			<Button
				type="button"
				variant="outline"
				size="sm"
				className="w-fit"
				disabled={pool >= QUIZ_LIMITS.questions}
				onClick={() => {
					const question = newQuestion();
					dispatch({ type: "addQuestion", chapterId, question });
					setOpenId(question.id);
				}}
			>
				<Icon name="add" />
				Ajouter une question
			</Button>
		</section>
	);
}
