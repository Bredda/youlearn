import type { Chapter, CourseContent, Question, Quiz } from "./schema";

/**
 * What a learner may receive of a quiz: its settings and the size of the pool, never the questions (they come
 * from an attempt, already drawn and without the answers).
 */
export type LearnerQuiz = Pick<Quiz, "blocking" | "passRate" | "drawCount"> & {
	poolSize: number;
};

export type LearnerChapter = Omit<Chapter, "quiz"> & { quiz?: LearnerQuiz };

export type LearnerContent = Omit<CourseContent, "chapters"> & {
	chapters: LearnerChapter[];
};

/** The questions of an attempt and the order of their options, kept so a resumed attempt looks the same. */
export type QuizDraw = { questionId: string; optionIds: string[] }[];

/** What a learner ticked: the chosen option ids by question id. */
export type QuizAnswers = Record<string, string[]>;

/** The content as a learner reads it: no quiz question, hence no right answer. */
export function toLearnerContent(content: CourseContent): LearnerContent {
	return {
		...content,
		chapters: content.chapters.map(({ quiz, ...chapter }) => ({
			...chapter,
			...(quiz && {
				quiz: {
					blocking: quiz.blocking,
					passRate: quiz.passRate,
					drawCount: quiz.drawCount,
					poolSize: quiz.questions.length,
				},
			}),
		})),
	};
}

/** A drawn question as the learner answers it: no `correct` flag, no explanation (those come with the correction). */
export type LearnerQuestion = {
	id: string;
	type: Question["type"];
	prompt: string;
	options: { id: string; text: string }[];
};
