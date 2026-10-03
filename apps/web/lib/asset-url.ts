/** Lessons refer to uploaded files as `asset:<id>`: they are served by the API, checked against the course's groups. */
export const assetUrl = (
	courseId: string,
	assetId: string,
	/** Token of a review link: lets a reader without access to the course load the files of the revision. */
	reviewToken?: string,
) =>
	`/api/courses/${courseId}/assets/${assetId}${
		reviewToken ? `?review=${encodeURIComponent(reviewToken)}` : ""
	}`;
