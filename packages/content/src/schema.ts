import { z } from "zod";
import { correctOptionsIssue, drawCountIssue, QUIZ_LIMITS } from "./quiz";
import { parseVideoUrl } from "./video";

export type MarkdownBlock = { id: string; type: "markdown"; body: string };
export type VideoBlock = {
	id: string;
	type: "video";
	/** The URL as pasted by the author (YouTube or Vimeo); the embed URL is derived by `parseVideoUrl`. */
	url: string;
	title: string;
};
export type Block = MarkdownBlock | VideoBlock;

export type QuestionOption = { id: string; text: string; correct: boolean };
export type Question = {
	id: string;
	type: "single" | "multiple";
	/** Markdown. */
	prompt: string;
	options: QuestionOption[];
	/** Markdown, shown after the answer. */
	explanation?: string | undefined;
};
export type Quiz = {
	/** A blocking quiz keeps the next chapter locked until `passRate` is reached (enforced on the learner side). */
	blocking: boolean;
	/** Percentage of correct answers expected, 1-100. Only meaningful when `blocking`. */
	passRate: number;
	/** `n`: how many questions are drawn from `questions` (the pool of `m`). */
	drawCount: number;
	questions: Question[];
};
export type Chapter = {
	id: string;
	title: string;
	blocks: Block[];
	/** Always last in the chapter. */
	quiz?: Quiz | undefined;
};
export type CourseContent = { version: 2; chapters: Chapter[] };

export const EMPTY_COURSE_CONTENT: CourseContent = {
	version: 2,
	chapters: [],
};

export const CONTENT_LIMITS = {
	chapters: 200,
	blocksPerChapter: 50,
	body: 200_000,
	markdownField: 10_000,
} as const;

const id = z.string().min(1).max(64);

const withUniqueIds = (
	items: { id: string }[],
	ctx: z.RefinementCtx,
	label: string,
) => {
	if (new Set(items.map((i) => i.id)).size !== items.length) {
		ctx.addIssue({ code: "custom", message: `${label} ids must be unique` });
	}
};

const blockSchema = z.discriminatedUnion("type", [
	z.object({
		id,
		type: z.literal("markdown"),
		body: z.string().max(CONTENT_LIMITS.body),
	}),
	z.object({
		id,
		type: z.literal("video"),
		url: z
			.string()
			.trim()
			.max(500)
			.refine((url) => parseVideoUrl(url) !== null, {
				message: "Only YouTube and Vimeo links (https) are supported",
			}),
		title: z.string().trim().min(1).max(200),
	}),
]);

const optionSchema = z.object({
	id,
	text: z.string().trim().min(1).max(500),
	correct: z.boolean(),
});

const questionSchema = z
	.object({
		id,
		type: z.enum(["single", "multiple"]),
		prompt: z.string().trim().min(1).max(CONTENT_LIMITS.markdownField),
		options: z
			.array(optionSchema)
			.min(QUIZ_LIMITS.optionsMin)
			.max(QUIZ_LIMITS.optionsMax),
		explanation: z.string().max(CONTENT_LIMITS.markdownField).optional(),
	})
	.superRefine((question, ctx) => {
		withUniqueIds(question.options, ctx, "Option");
		const issue = correctOptionsIssue(
			question.type,
			question.options.filter((o) => o.correct).length,
		);
		if (issue)
			ctx.addIssue({ code: "custom", message: issue, path: ["options"] });
	});

const quizSchema = z
	.object({
		blocking: z.boolean(),
		passRate: z.number().int().min(1).max(100),
		drawCount: z.number().int().min(1),
		questions: z.array(questionSchema).min(1).max(QUIZ_LIMITS.questions),
	})
	.superRefine((quiz, ctx) => {
		withUniqueIds(quiz.questions, ctx, "Question");
		const issue = drawCountIssue(quiz.drawCount, quiz.questions.length);
		if (issue)
			ctx.addIssue({ code: "custom", message: issue, path: ["drawCount"] });
	});

const chapterSchema = z
	.object({
		id,
		title: z.string().trim().min(1).max(200),
		blocks: z.array(blockSchema).max(CONTENT_LIMITS.blocksPerChapter),
		quiz: quizSchema.optional(),
	})
	.superRefine((chapter, ctx) => {
		withUniqueIds(chapter.blocks, ctx, "Block");
	});

/** Validation of what the editor saves. Keep in sync with `CourseContent` (checked by `satisfies`). */
export const contentSchema = z
	.object({
		version: z.literal(2),
		chapters: z.array(chapterSchema).max(CONTENT_LIMITS.chapters),
	})
	.superRefine(({ chapters }, ctx) => {
		withUniqueIds(chapters, ctx, "Chapter");
	}) satisfies z.ZodType<CourseContent>;
