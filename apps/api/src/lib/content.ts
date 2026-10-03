import type { CourseContent } from "@youlearn/types";
import { z } from "zod";

/** Validation of what the editor saves. Keep in sync with `CourseContent` (checked by `satisfies`). */
export const contentSchema = z
	.object({
		version: z.literal(1),
		lessons: z
			.array(
				z.object({
					id: z.string().min(1).max(64),
					title: z.string().trim().min(1).max(200),
					type: z.literal("markdown"),
					body: z.string().max(200_000),
				}),
			)
			.max(200),
	})
	.refine(
		({ lessons }) => new Set(lessons.map((l) => l.id)).size === lessons.length,
		{ message: "Lesson ids must be unique", path: ["lessons"] },
	) satisfies z.ZodType<CourseContent>;
