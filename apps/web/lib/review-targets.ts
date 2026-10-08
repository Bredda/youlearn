import type {
	CourseContent,
	ReviewTarget,
	ReviewThread,
} from "@youlearn/types";

/** Two targets name the same element. */
export function sameTarget(a: ReviewTarget, b: ReviewTarget): boolean {
	if (a.type !== b.type) return false;
	if (a.type === "revision") return true;
	return (
		a.chapterId === (b as typeof a).chapterId &&
		("itemId" in a ? a.itemId === (b as typeof a).itemId : true)
	);
}

/** The chapter a target belongs to (none for the revision itself). */
export const targetChapterId = (target: ReviewTarget) =>
	target.type === "revision" ? undefined : target.chapterId;

/** Threads still waiting for an answer. */
export const openThreads = (threads: ReviewThread[]) =>
	threads.filter((thread) => thread.status === "open");

/** The element inside its chapter, in words ("Bloc 3 (texte)"); none for a chapter or the revision itself. */
export function describeElement(
	content: CourseContent,
	target: ReviewTarget,
): string | undefined {
	if (target.type === "revision" || target.type === "chapter") return undefined;
	const chapter = content.chapters.find((c) => c.id === target.chapterId);
	if (target.type === "block") {
		const position =
			chapter?.blocks.findIndex((b) => b.id === target.itemId) ?? -1;
		const block = chapter?.blocks[position];
		return block
			? `Bloc ${position + 1} (${block.type === "markdown" ? "texte" : "vidéo"})`
			: "Bloc supprimé";
	}
	const position =
		chapter?.quiz?.questions.findIndex((q) => q.id === target.itemId) ?? -1;
	return position >= 0 ? `Question ${position + 1}` : "Question supprimée";
}

/** Where a remark is, in words: "Chapitre 2 · Bloc 3 (texte)". An element that was deleted has no position. */
export function describeTarget(
	content: CourseContent,
	target: ReviewTarget,
): string {
	if (target.type === "revision") return "Révision entière";
	const index = content.chapters.findIndex((c) => c.id === target.chapterId);
	const chapter = content.chapters[index];
	if (!chapter) return "Élément supprimé";
	const where = `Chapitre ${index + 1} · ${chapter.title || "(sans titre)"}`;
	const element = describeElement(content, target);
	return element ? `${where} · ${element}` : where;
}
