import { coverColor } from "@/lib/cover-color";

/** Stands in for the image of a course that has none: its name on a color picked from a short palette. */
export function CoverPlaceholder({
	courseId,
	name,
}: {
	courseId: string;
	name: string;
}) {
	return (
		<div
			// The title under the cover already names the course.
			aria-hidden="true"
			className={`flex aspect-video w-full items-center justify-center p-4 ${coverColor(courseId)}`}
			data-slot="cover-placeholder"
		>
			<span className="line-clamp-3 text-balance text-center font-semibold text-lg text-white">
				{name}
			</span>
		</div>
	);
}
