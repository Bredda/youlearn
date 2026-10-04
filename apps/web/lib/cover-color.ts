/**
 * Background of the placeholder shown in place of a course image. Full class names (Tailwind only generates what it
 * can read in the sources), all dark enough for white text.
 */
export const COVER_COLORS = [
	"bg-red-700",
	"bg-orange-700",
	"bg-amber-700",
	"bg-lime-700",
	"bg-emerald-700",
	"bg-teal-700",
	"bg-sky-700",
	"bg-indigo-700",
	"bg-violet-700",
	"bg-pink-700",
] as const;

/** A course always gets the same color (derived from its id), so its card does not change between visits. */
export function coverColor(courseId: string): (typeof COVER_COLORS)[number] {
	let hash = 0;
	for (const char of courseId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
	return COVER_COLORS[hash % COVER_COLORS.length] ?? COVER_COLORS[0];
}
