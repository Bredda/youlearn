import type { LearnerQuestion, QuizAnswers, QuizDraw } from "./learner";
import type { Question, Quiz } from "./schema";

/** Fisher-Yates on a copy. `random` returns a number in [0, 1), injectable so tests are deterministic. */
function shuffle<T>(items: readonly T[], random: () => number): T[] {
	const result = [...items];
	for (let i = result.length - 1; i > 0; i--) {
		const k = Math.min(i, Math.floor(random() * (i + 1)));
		const a = result[i];
		const b = result[k];
		if (a === undefined || b === undefined) continue;
		result[i] = b;
		result[k] = a;
	}
	return result;
}

/**
 * Draws the questions of an attempt: `drawCount` distinct questions from the pool, in random order, each with its
 * options in random order. Only ids are kept: the draw is stored with the attempt, so resuming it shows the same
 * questions and grading never depends on the client.
 */
export function drawQuiz(
	quiz: Quiz,
	random: () => number = Math.random,
): QuizDraw {
	return shuffle(quiz.questions, random)
		.slice(0, quiz.drawCount)
		.map((question) => ({
			questionId: question.id,
			optionIds: shuffle(
				question.options.map((option) => option.id),
				random,
			),
		}));
}

const questionsById = (quiz: Quiz) =>
	new Map(quiz.questions.map((question) => [question.id, question]));

/** The drawn questions as a learner sees them, in draw order, without any answer. */
export function learnerQuestions(
	quiz: Quiz,
	draw: QuizDraw,
): LearnerQuestion[] {
	const pool = questionsById(quiz);
	return draw.flatMap(({ questionId, optionIds }) => {
		const question = pool.get(questionId);
		if (!question) return [];
		const options = new Map(question.options.map((o) => [o.id, o]));
		return [
			{
				id: question.id,
				type: question.type,
				prompt: question.prompt,
				options: optionIds.flatMap((id) => {
					const option = options.get(id);
					return option ? [{ id: option.id, text: option.text }] : [];
				}),
			},
		];
	});
}

/**
 * Why `answers` cannot be graded, or null. Unanswered questions are fine (they count as wrong); an answer for a
 * question that was not drawn, an option that does not exist, a repeated option or several options on a single
 * choice question is a malformed request.
 */
export function answersIssue(
	quiz: Quiz,
	draw: QuizDraw,
	answers: QuizAnswers,
): string | null {
	const pool = questionsById(quiz);
	const drawn = new Set(draw.map((entry) => entry.questionId));
	for (const [questionId, chosen] of Object.entries(answers)) {
		const question = pool.get(questionId);
		if (!question || !drawn.has(questionId))
			return `Question ${questionId} is not part of this attempt`;
		const valid = new Set(question.options.map((option) => option.id));
		if (new Set(chosen).size !== chosen.length)
			return `Question ${questionId} has a repeated option`;
		if (chosen.some((id) => !valid.has(id)))
			return `Question ${questionId} has an unknown option`;
		if (question.type === "single" && chosen.length > 1)
			return `Question ${questionId} accepts a single option`;
	}
	return null;
}

export type QuestionCorrection = {
	questionId: string;
	correct: boolean;
	chosen: string[];
	correctOptionIds: string[];
	explanation?: string;
};

export type Grade = {
	/** Percentage of right questions, rounded. */
	score: number;
	passed: boolean;
	corrections: QuestionCorrection[];
};

const sameSet = (a: readonly string[], b: readonly string[]) =>
	a.length === b.length && a.every((id) => b.includes(id));

/**
 * Grades an attempt against the drawn questions. A question is right when the options ticked are exactly the
 * correct ones (nothing missing, nothing extra); the score is the share of right questions and the attempt is
 * passed when it reaches `passRate`.
 */
export function gradeAttempt(
	quiz: Quiz,
	draw: QuizDraw,
	answers: QuizAnswers,
): Grade {
	const pool = questionsById(quiz);
	const corrections = draw.flatMap(({ questionId }): QuestionCorrection[] => {
		const question: Question | undefined = pool.get(questionId);
		if (!question) return [];
		const chosen = answers[questionId] ?? [];
		const correctOptionIds = question.options
			.filter((option) => option.correct)
			.map((option) => option.id);
		return [
			{
				questionId,
				correct: sameSet(chosen, correctOptionIds),
				chosen,
				correctOptionIds,
				...(question.explanation && { explanation: question.explanation }),
			},
		];
	});
	const right = corrections.filter((entry) => entry.correct).length;
	const score =
		corrections.length === 0
			? 0
			: Math.round((right / corrections.length) * 100);
	return { score, passed: score >= quiz.passRate, corrections };
}
