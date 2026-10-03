import { formatDuration } from "@youlearn/content";
import type { EnrollmentView } from "@youlearn/types";
import Link from "next/link";
import { ChapterView } from "@/components/content/chapter-view";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * The course as a learner reads it: the chapters of the revision they follow, one at a time (the chapter is in the
 * URL). The quizzes are not played here yet.
 */
export function LearnPlayer({
	view,
	chapterId,
}: {
	view: EnrollmentView;
	chapterId?: string;
}) {
	const { enrollment, course, revision, content } = view;
	const chapters = content.chapters;
	const index = Math.max(
		0,
		chapters.findIndex((chapter) => chapter.id === chapterId),
	);
	const chapter = chapters[index];
	const previous = chapters[index - 1];
	const next = chapters[index + 1];
	const href = (id: string) => `/learn/${enrollment.id}?chapter=${id}`;

	return (
		<div className="flex flex-col gap-4">
			<PageHeader
				title={course.name}
				description={
					<>
						Révision {revision.key}
						{revision.durationMinutes > 0 &&
							` · ${formatDuration(revision.durationMinutes)}`}
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
						{chapters.map((c, i) => (
							<li key={c.id}>
								<Link
									href={href(c.id)}
									aria-current={c.id === chapter.id ? "page" : undefined}
									className={`block truncate rounded-md border px-2 py-1 text-sm ${
										c.id === chapter.id ? "bg-muted" : ""
									}`}
								>
									{i + 1}. {c.title}
								</Link>
							</li>
						))}
					</ol>
					<div className="flex min-w-0 flex-col gap-4">
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
								<Badge variant="outline" className="ml-auto">
									Bientôt disponible
								</Badge>
							</p>
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
							{next && (
								<Button
									nativeButton={false}
									render={<Link href={href(next.id)} />}
								>
									Suivant <Icon name="nextPage" />
								</Button>
							)}
						</nav>
					</div>
				</div>
			)}
		</div>
	);
}
