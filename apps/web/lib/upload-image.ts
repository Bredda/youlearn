import type { WriterAsset } from "@youlearn/types";

/** Uploads an image to a course and returns the markdown that displays it (`![name](asset:<id>)`). */
export async function uploadCourseImage(
	courseId: string,
	file: File,
): Promise<string> {
	const form = new FormData();
	form.append("file", file);
	const response = await fetch(`/api/writer/courses/${courseId}/assets`, {
		method: "POST",
		body: form,
	});
	if (!response.ok) {
		const data = (await response.json().catch(() => null)) as {
			error?: string;
		} | null;
		throw new Error(data?.error ?? "Échec de l'envoi de l'image");
	}
	const { asset } = (await response.json()) as { asset: WriterAsset };
	const alt = file.name.replace(/\.[^.]+$/, "").replace(/[[\]]/g, "");
	return `![${alt}](asset:${asset.id})`;
}
