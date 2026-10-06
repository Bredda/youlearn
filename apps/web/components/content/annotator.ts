import type { ReactNode } from "react";

/** Extra content a caller slots under the elements of a chapter (the review hangs its remarks there). */
export type Annotator = {
	/** Under the chapter heading. */
	chapter?: ReactNode;
	block?: (blockId: string) => ReactNode;
	question?: (questionId: string) => ReactNode;
};
