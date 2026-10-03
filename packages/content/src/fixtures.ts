import type { Block, Chapter, CourseContent, Question, Quiz } from "./schema";

export const md = (id: string, body = ""): Block => ({
	id,
	type: "markdown",
	body,
});

export const video = (
	id: string,
	url = "https://youtu.be/dQw4w9WgXcQ",
): Block => ({
	id,
	type: "video",
	url,
	title: "Video",
});

export const question = (id: string, correct = "a"): Question => ({
	id,
	type: "single",
	prompt: `Question ${id}`,
	options: ["a", "b"].map((o) => ({ id: o, text: o, correct: o === correct })),
});

export const quiz = (
	questions: Question[],
	overrides: Partial<Quiz> = {},
): Quiz => ({
	blocking: false,
	passRate: 70,
	drawCount: 1,
	questions,
	...overrides,
});

export const chapter = (
	id: string,
	blocks: Block[] = [],
	quizValue?: Quiz,
): Chapter => ({
	id,
	title: `Chapter ${id}`,
	blocks,
	...(quizValue && { quiz: quizValue }),
});

/** A final exam: only a quiz, always the last chapter of a certifying course. */
export const finalExam = (id = "exam"): Chapter => ({
	id,
	kind: "final-exam",
	title: "Final exam",
	blocks: [],
	quiz: quiz([question(`${id}-q1`)], { blocking: true }),
});

export const content = (...chapters: Chapter[]): CourseContent => ({
	version: 2,
	chapters,
});
