import { formatDuration } from "@youlearn/content";
import type { EnrollmentView } from "@youlearn/types";
import Link from "next/link";
import { ChapterView } from "@/components/content/chapter-view";
import { Icon } from "@/components/icon";
import { CompleteChapterButton } from "@/components/learn/complete-chapter-button";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * The course as a learner reads it: the chapters of the revision they follow, one at a time (the chapter is in the
 * URL). The server says which chapters are locked and sends none of their content. The quizzes are not played
 * here yet.
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
	const blockedByQuiz =
		chapter?.quiz?.blocking === true &&
		!view.passedQuizzes.includes(chapter.id);

	return (
		<div className="flex flex-col gap-4">
			<PageHeader
				title={course.name}
				description={
					<>
						Révision {revision.key}
						{revision.durationMinutes > 0 &&
							` · ${formatDuration(revision.durationMinutes)}`}
						{chapters.length > 0 &&
							` · ${done.length} / ${chapters.length} chapitres terminés`}
					</>
				}
			>
				<Button
					variant="outline"
					nativeButton={false}
					render={<Link href={`/courses/${course.id}`} />}
				>
					<Icon name="open" /> Fiche du cours
				</Button>
			</PageHeader>

			{enrollment.status === "completed" && (
				<p className="flex items-center gap-2 rounded-md border border-primary bg-primary/10 px-3 py-2 text-sm">
					<Icon name="done" /> Vous avez terminé ce cours.
				</p>
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
				<div className="grid gap-4 md:grid-cols-[16rem_1fr]">
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
											aria-current={c.id === chapter.id ? "page" : undefined}
											className={`flex items-center gap-2 rounded-md border px-2 py-1 text-sm ${
												c.id === chapter.id ? "bg-muted" : ""
											}`}
										>
											{label}
										</Link>
									)}
								</li>
							);
						})}
					</ol>
					<div className="flex min-w-0 flex-col gap-4">
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
								/>
								{chapter.quiz && (
									<p className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
										<Icon name="quiz" />
										Quiz : {chapter.quiz.drawCount} question
										{chapter.quiz.drawCount > 1 ? "s" : ""} tirée
										{chapter.quiz.drawCount > 1 ? "s" : ""} parmi{" "}
										{chapter.quiz.poolSize}
										{chapter.quiz.blocking &&
											" (à réussir pour ouvrir la suite)"}
										<Badge variant="outline" className="ml-auto">
											Bientôt disponible
										</Badge>
									</p>
								)}
								{state === "completed" ? (
									<Badge variant="secondary" className="self-start">
										<Icon name="done" /> Chapitre terminé
									</Badge>
								) : active && !isExam ? (
									blockedByQuiz ? (
										<p className="text-muted-foreground text-sm">
											Réussissez le quiz pour terminer ce chapitre.
										</p>
									) : (
										<CompleteChapterButton
											enrollmentId={enrollment.id}
											chapterId={chapter.id}
											nextHref={next ? href(next.id) : undefined}
										/>
									)
								) : null}
							</>
						)}
						<nav className="flex justify-between gap-2">
							{previous ? (
								<Button
									variant="outline"
									nativeButton={false}
									render={<Link href={href(previous.id)} />}
								>
									<Icon name="previousPage" /> Précédent
								</Button>
							) : (
								<span />
							)}
							{next &&
								(chapterStates[next.id] === "locked" ? (
									<Button variant="outline" disabled>
										<Icon name="locked" /> Suivant
									</Button>
								) : (
									<Button
										nativeButton={false}
										render={<Link href={href(next.id)} />}
									>
										Suivant <Icon name="nextPage" />
									</Button>
								))}
						</nav>
					</div>
				</div>
			)}
		</div>
	);
}
