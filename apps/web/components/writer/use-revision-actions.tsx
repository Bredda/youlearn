"use client";

import type {
	ChangeImpact,
	RevisionStatus,
	WriterCourse,
	WriterRevision,
} from "@youlearn/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { ReviewersDialog } from "@/components/writer/reviewers-dialog";
import { RevisionFormDialog } from "@/components/writer/revision-form-dialog";
import type { RevisionAction } from "@/components/writer/revision-row-actions";
import { RevisionStatusDialog } from "@/components/writer/revision-status-dialog";
import { callApi } from "@/lib/api-client";
import { reviewWarnings } from "@/lib/review-summary";

/** What the user has to confirm before the API accepts the change. */
type Confirmation = {
	revision: WriterRevision;
	to: "published" | "deprecated";
};

/**
 * What the revision tabs of a course do with a revision (change its status, clone, choose reviewers, delete) and
 * the dialogs those need. The tab renders `dialogs` once; `onAction` and `startCreating` open them.
 */
export function useRevisionActions({
	course,
	revisions,
	suggestedKey,
}: {
	course: WriterCourse;
	revisions: WriterRevision[];
	suggestedKey: string;
}) {
	const router = useRouter();
	// `undefined` = closed, otherwise the revision to start from (none = the default one).
	const [creating, setCreating] = useState<{ baseId?: string }>();
	const [reviewing, setReviewing] = useState<WriterRevision>();
	const [confirming, setConfirming] = useState<Confirmation>();
	const [deleting, setDeleting] = useState<WriterRevision>();
	const [error, setError] = useState<string>();
	const [pending, setPending] = useState(false);

	// Only one revision at a time is being worked on or reviewed.
	const open = course.current.draft ?? course.current.preview;
	const published = course.current.published;
	const api = `/api/writer/courses/${course.id}/revisions`;

	async function run(request: Promise<string | null>) {
		setPending(true);
		setError(undefined);
		const message = await request;
		setPending(false);
		setConfirming(undefined);
		if (message) return setError(message);
		router.refresh();
	}

	const setStatus = (
		revision: WriterRevision,
		to: RevisionStatus,
		confirm = false,
		changeImpact?: ChangeImpact,
	) =>
		run(
			callApi("POST", `${api}/${revision.id}/status`, {
				to,
				confirm,
				changeImpact,
			}),
		);

	/** Publishing over a published revision and deprecating both retire a live revision: ask first. */
	function changeStatus(revision: WriterRevision, to: RevisionStatus) {
		// Going to review starts by choosing the reviewers.
		if (to === "preview") return setReviewing(revision);
		const unfinishedReview = reviewWarnings(revision.review).length > 0;
		if (
			(to === "published" && (published || unfinishedReview)) ||
			to === "deprecated"
		)
			return setConfirming({ revision, to });
		return setStatus(revision, to);
	}

	function onAction(action: RevisionAction, revision: WriterRevision) {
		switch (action.type) {
			case "status":
				return changeStatus(revision, action.to);
			case "clone":
				return setCreating({ baseId: revision.id });
			case "reviewers":
				return setReviewing(revision);
			case "delete":
				return setDeleting(revision);
		}
	}

	const dialogs = (
		<>
			{creating && (
				<RevisionFormDialog
					courseId={course.id}
					revisions={revisions}
					suggestedKey={suggestedKey}
					baseId={creating.baseId}
					onClose={() => setCreating(undefined)}
					onDone={() => {
						setCreating(undefined);
						router.refresh();
					}}
				/>
			)}

			{deleting && (
				<ConfirmDeleteDialog
					title={`Supprimer la révision « ${deleting.key} » ?`}
					description="Son contenu sera perdu. Cette action est définitive."
					expected={deleting.key}
					onConfirm={() => callApi("DELETE", `${api}/${deleting.id}`)}
					onClose={() => setDeleting(undefined)}
					onDone={() => {
						setDeleting(undefined);
						router.refresh();
					}}
				/>
			)}

			{reviewing && (
				<ReviewersDialog
					courseId={course.id}
					// Read from the refreshed list so the reviewers are not shown stale.
					revision={revisions.find((r) => r.id === reviewing.id) ?? reviewing}
					onClose={() => setReviewing(undefined)}
					onDone={() => {
						// Sending to review closes the dialog; changing the reviewers of a revision already in review does not.
						if (reviewing.status === "draft") setReviewing(undefined);
						router.refresh();
					}}
				/>
			)}

			{confirming && (
				<RevisionStatusDialog
					courseId={course.id}
					revisionId={confirming.revision.id}
					revisionKey={confirming.revision.key}
					to={confirming.to}
					publishedKey={published?.key}
					review={confirming.revision.review}
					pending={pending}
					onConfirm={(changeImpact) =>
						setStatus(confirming.revision, confirming.to, true, changeImpact)
					}
					onClose={() => setConfirming(undefined)}
				/>
			)}
		</>
	);

	return {
		onAction,
		pending,
		error,
		open,
		published,
		startCreating: () => setCreating({}),
		dialogs,
	};
}
