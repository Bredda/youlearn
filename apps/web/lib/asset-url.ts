/** Lessons refer to uploaded files as `asset:<id>`: they are served by the API, checked against the course's groups. */
export const assetUrl = (courseId: string, assetId: string) =>
	`/api/courses/${courseId}/assets/${assetId}`;
