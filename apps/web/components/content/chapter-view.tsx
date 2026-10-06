import { type Chapter, formatDuration } from "@youlearn/content";
import type { Annotator } from "@/components/content/annotator";
import { QuizView } from "@/components/content/quiz-view";
import { VideoEmbed } from "@/components/content/video-embed";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/writer/markdown";

/** Title of a chapter with its exam and duration badges. */
export function ChapterHeading({
	chapter,
	className,
}: {
	chapter: Pick<Chapter, "title" | "kind" | "estimatedMinutes">;
	className?: string;
}) {
	return (
		<div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
			<h2 className="font-semibold text-xl">{chapter.title}</h2>
			{chapter.kind === "final-exam" && (
				<Badge variant="outline">
					<Icon name="certifying" /> Examen final
				</Badge>
			)}
			{chapter.estimatedMinutes !== undefined && (
				<Badge variant="secondary">
					<Icon name="duration" /> {formatDuration(chapter.estimatedMinutes)}
				</Badge>
			)}
		</div>
	);
}

/** A chapter as a reader sees it: its blocks in order, then its quiz. */
export function ChapterView({
	chapter,
	courseId,
	heading = true,
	annotate,
}: {
	chapter: Chapter;
	courseId: string;
	/** False when the caller draws the heading itself (the learner player pins it). */
	heading?: boolean;
	/** Extra content under the heading, each block and each question (the review hangs its remarks there). */
	annotate?: Annotator;
}) {
	return (
		<article className="min-w-0 rounded-md border p-4">
			{heading && <ChapterHeading chapter={chapter} className="mb-2" />}
			{annotate?.chapter}
			{chapter.blocks.length === 0 && !chapter.quiz && (
				<p className="text-muted-foreground text-sm">Ce chapitre est vide.</p>
			)}
			{chapter.blocks.map((block) => (
				<div key={block.id} className="group/block" data-annotate>
					{block.type === "markdown" ? (
						<Markdown courseId={courseId}>{block.body}</Markdown>
					) : (
						<figure>
							<VideoEmbed url={block.url} title={block.title} />
							{block.title && (
								<figcaption className="text-muted-foreground text-xs">
									{block.title}
								</figcaption>
							)}
						</figure>
					)}
					{annotate?.block?.(block.id)}
				</div>
			))}
			{chapter.quiz && (
				<QuizView
					quiz={chapter.quiz}
					courseId={courseId}
					{...(annotate?.question && { annotate: annotate.question })}
				/>
			)}
		</article>
	);
}
