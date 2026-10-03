import { type Chapter, formatDuration } from "@youlearn/content";
import { QuizView } from "@/components/content/quiz-view";
import { VideoEmbed } from "@/components/content/video-embed";
import { Icon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Markdown } from "@/components/writer/markdown";

/** A chapter as a reader sees it: its blocks in order, then its quiz. */
export function ChapterView({
	chapter,
	courseId,
	reviewToken,
}: {
	chapter: Chapter;
	courseId: string;
	reviewToken?: string;
}) {
	return (
		<article className="min-w-0 rounded-md border p-4">
			<div className="mb-2 flex flex-wrap items-center gap-2">
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
			{chapter.blocks.length === 0 && !chapter.quiz && (
				<p className="text-muted-foreground text-sm">Ce chapitre est vide.</p>
			)}
			{chapter.blocks.map((block) =>
				block.type === "markdown" ? (
					<Markdown
						key={block.id}
						courseId={courseId}
						reviewToken={reviewToken}
					>
						{block.body}
					</Markdown>
				) : (
					<figure key={block.id}>
						<VideoEmbed url={block.url} title={block.title} />
						{block.title && (
							<figcaption className="text-muted-foreground text-xs">
								{block.title}
							</figcaption>
						)}
					</figure>
				),
			)}
			{chapter.quiz && (
				<QuizView
					quiz={chapter.quiz}
					courseId={courseId}
					reviewToken={reviewToken}
				/>
			)}
		</article>
	);
}
