import { formatDuration } from "@youlearn/content";
import type { EnrollmentView } from "@youlearn/types";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ChapterHeading, ChapterView } from "@/components/content/chapter-view";
import { Icon } from "@/components/icon";
import { CompleteChapterButton } from "@/components/learn/complete-chapter-button";
import { CompletionDialog } from "@/components/learn/completion-dialog";
import { NextChapterButton } from "@/components/learn/next-chapter-button";
import {
	QuizRunner,
	QuizSession,
	QuizStartButton,
} from "@/components/learn/quiz-runner";
import { ReadingEnd, ReadingGate } from "@/components/learn/reading-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * The course as a learner reads it: the chapters of the revision they follow, one at a time (the chapter is in the
 * URL). The server says which chapters are locked and sends none of their content.
 */
export function LearnPlayer({
	view,
	chapterId,
}: {
	view: EnrollmentView;
	chapterId?: string;
}) {
	const { enrollment, course, revision, content, chapterStates } = view;
	const chapters = content.chapters;
	const index = Math.max(
		0,
		chapters.findIndex((chapter) => chapter.id === chapterId),
	);
	const chapter = chapters[index];
	const previous = chapters[index - 1];
	const next = chapters[index + 1];
	const href = (id: string) => `/learn/${enrollment.id}?chapter=${id}`;
	const done = chapters.filter((c) => chapterStates[c.id] === "completed");
	const state = chapter ? chapterStates[chapter.id] : undefined;
	const active = enrollment.status === "in_progress";
	const isExam = chapter?.kind === "final-exam";
	const examScore =
		view.attempts.find((attempt) => attempt.finalExam)?.score ?? null;
	const blockedByQuiz =
		chapter?.quiz?.blocking === true &&
		!view.passedQuizzes.includes(chapter.id);
	const canComplete = active && !isExam && !blockedByQuiz;

	const progress =
		chapters.length > 0 ? Math.round((done.length / chapters.length) * 100) : 0;

	return (
		<div className="flex flex-col gap-4">
			<CompletionDialog
				enrollment={enrollment}
				courseId={course.id}
				courseName={course.name}
				certifying={revision.certifying}
			/>

			{/* From md up the left panel and the chapter heading stay pinned under the site header while the content scrolls. */}
			<div className="grid gap-4 md:grid-cols-[18rem_1fr] md:items-start">
				<aside className="flex min-h-0 flex-col gap-5 md:sticky md:top-(--header-height) md:-mt-4 md:max-h-[calc(100svh-var(--header-height))] md:pt-4">
					<div className="flex flex-col gap-2 rounded-lg border bg-card p-3 text-card-foreground">
						<h1 className="font-semibold text-xl">{course.name}</h1>
						<p className="text-muted-foreground text-sm">
							Révision {revision.key}
							{revision.durationMinutes > 0 &&
								` · ${formatDuration(revision.durationMinutes)}`}
						</p>
						{chapters.length > 0 && (
							<div className="flex flex-col gap-1">
								<div
									role="progressbar"
									aria-label="Progression"
									aria-valuemin={0}
									aria-valuemax={100}
									aria-valuenow={progress}
									className="h-1.5 overflow-hidden rounded-full bg-muted"
								>
									<div
										className="h-full bg-primary"
										style={{ width: `${progress}%` }}
									/>
								</div>
								<p className="text-muted-foreground text-xs">
									{done.length} / {chapters.length} chapitres terminés
								</p>
							</div>
						)}
						<Button
							className="self-start"
							variant="outline"
							nativeButton={false}
							render={<Link href={`/courses/${course.id}`} />}
						>
							<Icon name="open" /> Fiche du cours
						</Button>
					</div>
					{chapters.length > 0 && (
						<nav
							aria-label="Chapitres"
							className="-mx-1 max-h-60 min-h-0 overflow-y-auto px-1 pb-1 md:max-h-none md:flex-1"
						>
							<ol className="flex flex-col gap-1">
								{chapters.map((c, i) => {
									const chapterState = chapterStates[c.id];
									const label = (
										<>
											<span className="min-w-0 flex-1 truncate">
												{i + 1}. {c.title}
											</span>
											{chapterState === "completed" && (
												<Icon name="done" className="size-4 shrink-0" />
											)}
											{chapterState === "locked" && (
												<Icon name="locked" className="size-4 shrink-0" />
											)}
										</>
									);
									return (
										<li key={c.id}>
											{chapterState === "locked" ? (
												<span
													title="Chapitre verrouillé"
													className="flex items-center gap-2 rounded-md border px-2 py-1 text-muted-foreground text-sm"
												>
													{label}
												</span>
											) : (
												<Link
													href={href(c.id)}
													aria-current={
														c.id === chapter?.id ? "page" : undefined
													}
													className={`flex items-center gap-2 rounded-md border px-2 py-1 text-sm ${
														c.id === chapter?.id ? "bg-muted" : ""
													}`}
												>
													{label}
												</Link>
											)}
										</li>
									);
								})}
							</ol>
						</nav>
					)}
				</aside>

				<div className="flex min-w-0 flex-col gap-4">
					{enrollment.status === "completed" && (
						<p className="flex items-center gap-2 rounded-md border border-primary bg-primary/10 px-3 py-2 text-sm">
							<Icon name="done" /> Vous avez terminé ce cours.
						</p>
					)}
					{enrollment.status === "failed" && (
						<div className="flex flex-col gap-2 rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm">
							<p>
								Vous n'avez pas réussi l'examen final
								{examScore !== null && ` (score ${examScore} %)`}. Pour obtenir
								la certification, il faut recommencer le cours depuis le début.
							</p>
							<Button
								className="self-start"
								nativeButton={false}
								render={<Link href={`/courses/${course.id}`} />}
							>
								<Icon name="retry" /> Recommencer le cours
							</Button>
						</div>
					)}
					{enrollment.outdated && (
						<p className="rounded-md border border-dashed bg-muted/50 px-3 py-2 text-sm">
							Une version plus récente de ce cours a été publiée. Vous suivez la
							révision {enrollment.revisionKey}, celle de votre inscription.
						</p>
					)}

					{chapters.length === 0 || !chapter ? (
						<p className="text-muted-foreground text-sm">
							Ce cours n'a pas encore de chapitre.
						</p>
					) : (
						<ReadingGate
							// A new key per chapter resets the reading progress and the quiz in progress.
							key={chapter.id}
							required={active && state === "available"}
						>
							<QuizSessionIf
								quizProps={
									chapter.quiz && state !== "locked"
										? {
												enrollmentId: enrollment.id,
												courseId: course.id,
												chapterId: chapter.id,
												quiz: chapter.quiz,
												finalExam: isExam,
												active,
												attempts: view.attempts.filter(
													(attempt) => attempt.chapterId === chapter.id,
												),
											}
										: null
								}
							>
								<div className="sticky top-(--header-height) z-10 -mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b bg-background pt-4 pb-3">
									<ChapterHeading chapter={chapter} />
									<div className="ml-auto flex flex-wrap items-center justify-end gap-2">
										{previous && (
											<Button
												variant="outline"
												nativeButton={false}
												render={<Link href={href(previous.id)} />}
											>
												<Icon name="previousPage" /> Précédent
											</Button>
										)}
										{chapter.quiz && state !== "locked" && <QuizStartButton />}
										{state === "completed" ? (
											<Badge variant="secondary">
												<Icon name="done" /> Chapitre terminé
											</Badge>
										) : (
											canComplete && (
												<CompleteChapterButton
													enrollmentId={enrollment.id}
													chapterId={chapter.id}
													nextHref={next ? href(next.id) : undefined}
												/>
											)
										)}
										{next && (
											<NextChapterButton
												href={href(next.id)}
												locked={chapterStates[next.id] === "locked"}
											/>
										)}
									</div>
								</div>
								{state === "locked" ? (
									<div className="flex items-start gap-2 rounded-md border border-dashed p-4 text-sm">
										<Icon name="locked" className="mt-0.5 size-4 shrink-0" />
										<div>
											<p className="font-medium">{chapter.title}</p>
											<p className="text-muted-foreground">
												{isExam
													? "L'examen final s'ouvre quand tous les autres chapitres sont terminés."
													: "Ce chapitre s'ouvre quand le quiz du chapitre précédent est réussi."}
											</p>
										</div>
									</div>
								) : (
									<>
										<ChapterView
											chapter={{ ...chapter, quiz: undefined }}
											courseId={course.id}
											heading={false}
										/>
										<ReadingEnd />
										{chapter.quiz && <QuizRunner />}
										{blockedByQuiz &&
											active &&
											!isExam &&
											state !== "completed" && (
												<p className="text-muted-foreground text-sm">
													Réussissez le quiz pour terminer ce chapitre.
												</p>
											)}
									</>
								)}
							</QuizSessionIf>
						</ReadingGate>
					)}
				</div>
			</div>
		</div>
	);
}

/** Wraps its children in the quiz session of the chapter when it has a playable quiz. */
function QuizSessionIf({
	quizProps,
	children,
}: {
	quizProps: Omit<ComponentProps<typeof QuizSession>, "children"> | null;
	children: ReactNode;
}) {
	return quizProps ? (
		<QuizSession {...quizProps}>{children}</QuizSession>
	) : (
		children
	);
}
