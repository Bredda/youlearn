import type { WriterCourse, WriterRevision } from "@youlearn/types";
import { cache } from "react";
import { apiFetch } from "@/lib/api";

/**
 * The course and its revisions, read once per request: the page, its layout and the breadcrumb all need them
 * and `cache` makes them share one call. `null` when the user cannot see the course (a writer outside its groups
 * gets a 403, which looks like a missing course).
 */
export const getWriterCourse = cache(
	async (id: string): Promise<WriterCourse | null> => {
		const response = await apiFetch(
			`/api/writer/courses/${encodeURIComponent(id)}`,
		);
		if (response.status === 404 || response.status === 403) return null;
		if (!response.ok) throw new Error("Impossible de charger le cours");
		return ((await response.json()) as { course: WriterCourse }).course;
	},
);

export const getWriterRevisions = cache(
	async (id: string): Promise<WriterRevision[]> => {
		const response = await apiFetch(
			`/api/writer/courses/${encodeURIComponent(id)}/revisions`,
		);
		if (!response.ok) throw new Error("Impossible de charger les révisions");
		return ((await response.json()) as { revisions: WriterRevision[] })
			.revisions;
	},
);
