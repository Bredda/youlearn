export const QUIZ_LIMITS = {
	questions: 200,
	optionsMin: 2,
	optionsMax: 10,
} as const;

export type QuestionKind = "single" | "multiple";

/**
 * How many correct options a question must have: exactly one for a single choice, at least one for a
 * multiple choice. Returns a message when `correct` is not acceptable.
 */
export function correctOptionsIssue(
	type: QuestionKind,
	correct: number,
): string | null {
	if (type === "single" && correct !== 1) {
		return "A single choice question needs exactly one correct option";
	}
	if (type === "multiple" && correct < 1) {
		return "A multiple choice question needs at least one correct option";
	}
	return null;
}

/** `n` questions are drawn from a pool of `m`: `1 <= n <= m`. */
export function drawCountIssue(
	drawCount: number,
	poolSize: number,
): string | null {
	if (drawCount < 1) return "At least one question must be drawn";
	if (drawCount > poolSize) {
		return "Cannot draw more questions than the pool holds";
	}
	return null;
}
