"use client";

import { type Block, type Chapter, parseVideoUrl } from "@youlearn/content";
import { VideoEmbed } from "@/components/content/video-embed";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmRemove } from "@/components/writer/confirm-remove";
import { MarkdownField } from "@/components/writer/markdown-field";
import { QuizEditor } from "@/components/writer/quiz-editor";
import { DragHandle, SortableList } from "@/components/writer/sortable-list";
import {
	type EditAction,
	newMarkdownBlock,
	newVideoBlock,
} from "@/lib/content-editor";

function BlockBody({
	chapterId,
	block,
	courseId,
	base,
	baseKey,
	dispatch,
}: {
	chapterId: string;
	block: Block;
	courseId: string;
	/** The same block in the base revision, when it exists there. */
	base: Block | undefined;
	baseKey?: string | undefined;
	dispatch: (action: EditAction) => void;
}) {
	if (block.type === "markdown") {
		return (
			<MarkdownField
				courseId={courseId}
				label="Contenu du bloc de texte"
				value={block.body}
				original={base?.type === "markdown" ? base.body : undefined}
				{...(baseKey && { originalLabel: baseKey })}
				onChange={(body) =>
					dispatch({
						type: "updateBlock",
						chapterId,
						blockId: block.id,
						patch: { body },
					})
				}
			/>
		);
	}
	const unknown = block.url.trim() !== "" && parseVideoUrl(block.url) === null;
	return (
		<div className="flex flex-col gap-3">
			<div className="grid gap-3 sm:grid-cols-2">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor={`url-${block.id}`}>Lien de la vidéo</Label>
					<Input
						id={`url-${block.id}`}
						type="url"
						placeholder="https://www.youtube.com/watch?v=…"
						value={block.url}
						aria-invalid={unknown}
						onChange={(e) =>
							dispatch({
								type: "updateBlock",
								chapterId,
								blockId: block.id,
								patch: { url: e.target.value },
							})
						}
					/>
					<p
						className={`text-xs ${unknown ? "text-destructive" : "text-muted-foreground"}`}
					>
						{unknown
							? "Lien non reconnu : seuls YouTube et Vimeo (https) sont acceptés."
							: "YouTube ou Vimeo."}
					</p>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor={`title-${block.id}`}>Titre</Label>
					<Input
						id={`title-${block.id}`}
						value={block.title}
						onChange={(e) =>
							dispatch({
								type: "updateBlock",
								chapterId,
								blockId: block.id,
								patch: { title: e.target.value },
							})
						}
					/>
				</div>
			</div>
			{block.url.trim() !== "" && !unknown && (
				<div className="max-w-xl">
					<VideoEmbed url={block.url} title={block.title} />
				</div>
			)}
		</div>
	);
}

/** Edits one chapter of a draft: title, ordered blocks (text, video) and the optional quiz that concludes it. */
export function ChapterEditor({
	chapter,
	courseId,
	baseChapter,
	baseKey,
	dispatch,
}: {
	chapter: Chapter;
	courseId: string;
	/** The chapter in the base revision, for the inline diff of its text blocks. */
	baseChapter: Chapter | undefined;
	baseKey?: string | undefined;
	dispatch: (action: EditAction) => void;
}) {
	const chapterId = chapter.id;
	return (
		<div className="flex min-w-0 flex-col gap-4 rounded-md border p-4">
			<div className="flex flex-col gap-1.5">
				<Label htmlFor={`chapter-title-${chapterId}`}>Titre du chapitre</Label>
				<Input
					id={`chapter-title-${chapterId}`}
					value={chapter.title}
					onChange={(e) =>
						dispatch({
							type: "renameChapter",
							chapterId,
							title: e.target.value,
						})
					}
				/>
			</div>

			<SortableList
				items={chapter.blocks}
				className="flex flex-col gap-3"
				onMove={(from, to) =>
					dispatch({ type: "moveBlock", chapterId, from, to })
				}
			>
				{(block, index, handleRef) => (
					<div className="flex flex-col gap-3 rounded-md border p-3">
						<div className="flex items-center gap-2">
							<DragHandle
								handleRef={handleRef}
								label={`Déplacer le bloc ${index + 1}`}
							/>
							<Icon
								name={block.type === "video" ? "videoBlock" : "textBlock"}
								className="size-4"
							/>
							<span className="font-medium text-sm">
								{block.type === "video" ? "Vidéo" : "Texte"}
							</span>
							<span className="ml-auto" />
							<ConfirmRemove
								label={`Supprimer le bloc ${index + 1}`}
								title="Supprimer ce bloc ?"
								description="Son contenu sera perdu à l'enregistrement du brouillon."
								onConfirm={() =>
									dispatch({
										type: "removeBlock",
										chapterId,
										blockId: block.id,
									})
								}
							/>
						</div>
						<BlockBody
							chapterId={chapterId}
							block={block}
							courseId={courseId}
							base={baseChapter?.blocks.find((b) => b.id === block.id)}
							baseKey={baseKey}
							dispatch={dispatch}
						/>
					</div>
				)}
			</SortableList>

			<div className="flex flex-wrap gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() =>
						dispatch({ type: "addBlock", chapterId, block: newMarkdownBlock() })
					}
				>
					<Icon name="textBlock" />
					Ajouter un texte
				</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() =>
						dispatch({ type: "addBlock", chapterId, block: newVideoBlock() })
					}
				>
					<Icon name="videoBlock" />
					Ajouter une vidéo
				</Button>
				{!chapter.quiz && (
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => dispatch({ type: "addQuiz", chapterId })}
					>
						<Icon name="quiz" />
						Ajouter un quiz
					</Button>
				)}
			</div>

			{chapter.quiz && (
				<QuizEditor
					chapterId={chapterId}
					quiz={chapter.quiz}
					courseId={courseId}
					dispatch={dispatch}
				/>
			)}
		</div>
	);
}
