import { z } from "zod";
import type { CourseContent } from "./schema";

/**
 * What a review remark is about. Chapters, blocks and questions are named by their stable ids, so a remark keeps
 * pointing at the right element while the writer edits (no line or character positions: they drift).
 */
export const reviewTargetSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("revision") }),
	z.object({ type: z.literal("chapter"), chapterId: z.string().min(1) }),
	z.object({
		type: z.literal("block"),
		chapterId: z.string().min(1),
		itemId: z.string().min(1),
	}),
	z.object({
		type: z.literal("question"),
		chapterId: z.string().min(1),
		itemId: z.string().min(1),
	}),
]);

export type ReviewTarget = z.infer<typeof reviewTargetSchema>;

/** Whether the element a remark points at is still in the content (a deleted one leaves the remark orphaned). */
export function reviewTargetExists(
	content: CourseContent,
	target: ReviewTarget,
): boolean {
	if (target.type === "revision") return true;
	const chapter = content.chapters.find((c) => c.id === target.chapterId);
	if (!chapter) return false;
	if (target.type === "chapter") return true;
	if (target.type === "block")
		return chapter.blocks.some((block) => block.id === target.itemId);
	return (
		chapter.quiz?.questions.some((question) => question.id === target.itemId) ??
		false
	);
}
