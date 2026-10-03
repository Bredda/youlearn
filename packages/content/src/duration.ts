import type { Chapter, CourseContent } from "./schema";

/** Sum of the estimated durations of the chapters, in minutes (a chapter without estimate counts for nothing). */
export function courseDurationMinutes(
	content: Pick<CourseContent, "chapters">,
): number {
	return content.chapters.reduce(
		(sum, c) => sum + (c.estimatedMinutes ?? 0),
		0,
	);
}

/** Chapters a writer has not estimated yet. */
export function chaptersMissingDuration(
	content: Pick<CourseContent, "chapters">,
): Chapter[] {
	return content.chapters.filter((c) => c.estimatedMinutes === undefined);
}

/** `45 min`, `2 h`, `2 h 30`. Nothing for a zero or invalid duration. */
export function formatDuration(minutes: number): string {
	if (!Number.isFinite(minutes) || minutes < 1) return "";
	const total = Math.round(minutes);
	const hours = Math.floor(total / 60);
	const rest = total % 60;
	if (hours === 0) return `${rest} min`;
	return rest === 0
		? `${hours} h`
		: `${hours} h ${String(rest).padStart(2, "0")}`;
}
