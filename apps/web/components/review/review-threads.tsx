"use client";

import type { ReviewTarget, ReviewThread } from "@youlearn/types";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from "react";
import { FormError } from "@/components/form-error";
import { Icon, PendingIcon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fetchApi } from "@/lib/api-client";
import { openThreads, sameTarget } from "@/lib/review-targets";

type Payload = { threads: ReviewThread[]; canWrite: boolean };

type Remarks = {
	threads: ReviewThread[];
	/** Remarks can be added (the revision is in review). */
	canWrite: boolean;
	/** Starts a thread, or answers one when `parentId` is given. Returns an error message, or null. */
	post: (
		input:
			| { target: ReviewTarget; quote?: string; body: string }
			| { parentId: string; body: string },
	) => Promise<string | null>;
	setStatus: (
		threadId: string,
		status: "open" | "resolved",
	) => Promise<string | null>;
	/** Loads the threads again (somebody else may have written since). */
	reload: () => Promise<void>;
};

const RemarksContext = createContext<Remarks | null>(null);

export function useRemarks() {
	const remarks = useContext(RemarksContext);
	if (!remarks) throw new Error("Needs a <RemarksProvider>");
	return remarks;
}

/**
 * The remarks of a revision, shared by whatever shows them (the reviewer's page, the editor's panel and badges).
 * Every change answers with the whole list, so what is shown is what the server holds; the list is also loaded
 * again when the window regains focus, since the other party writes meanwhile.
 */
export function RemarksProvider({
	revisionId,
	initial,
	children,
}: {
	revisionId: string;
	initial: Payload;
	children: ReactNode;
}) {
	const [state, setState] = useState(initial);
	const url = `/api/revisions/${revisionId}/comments`;

	const apply = useCallback(
		async (request: ReturnType<typeof fetchApi<Payload>>) => {
			const result = await request;
			if (result.data === null) return result.error;
			setState(result.data);
			return null;
		},
		[],
	);

	const reload = useCallback(async () => {
		const result = await fetchApi<Payload>("GET", url);
		if (result.data) setState(result.data);
	}, [url]);

	useEffect(() => {
		window.addEventListener("focus", reload);
		return () => window.removeEventListener("focus", reload);
	}, [reload]);

	const value = useMemo<Remarks>(
		() => ({
			threads: state.threads,
			canWrite: state.canWrite,
			post: (input) => apply(fetchApi<Payload>("POST", url, input)),
			setStatus: (threadId, status) =>
				apply(fetchApi<Payload>("PATCH", `${url}/${threadId}`, { status })),
			reload,
		}),
		[state, url, apply, reload],
	);
	return <RemarksContext value={value}>{children}</RemarksContext>;
}

const dateFormat = new Intl.DateTimeFormat("fr-FR", {
	dateStyle: "medium",
	timeStyle: "short",
});

/** Writes a comment: a new thread or an answer. */
function CommentForm({
	placeholder,
	submitLabel,
	onSubmit,
	onCancel,
}: {
	placeholder: string;
	submitLabel: string;
	onSubmit: (body: string) => Promise<string | null>;
	onCancel?: () => void;
}) {
	const [body, setBody] = useState("");
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		if (!body.trim()) return;
		setPending(true);
		const message = await onSubmit(body.trim());
		setPending(false);
		if (message) return setError(message);
		setBody("");
		onCancel?.();
	}

	return (
		<form className="flex flex-col gap-2" onSubmit={submit}>
			<Textarea
				value={body}
				onChange={(event) => setBody(event.target.value)}
				placeholder={placeholder}
				aria-label={placeholder}
				maxLength={4000}
			/>
			{error && <FormError>{error}</FormError>}
			<div className="flex gap-2">
				<Button type="submit" disabled={pending || !body.trim()}>
					<PendingIcon pending={pending} name="remark" />
					{submitLabel}
				</Button>
				{onCancel && (
					<Button type="button" variant="outline" onClick={onCancel}>
						Annuler
					</Button>
				)}
			</div>
		</form>
	);
}

/** One thread: the quoted text, the comments, an answer form and the button that closes or reopens it. */
export function ThreadCard({
	thread,
	where,
}: {
	thread: ReviewThread;
	/** Where the remark is, when the card is shown away from its element. */
	where?: string;
}) {
	const { canWrite, post, setStatus } = useRemarks();
	const resolved = thread.status === "resolved";
	const [expanded, setExpanded] = useState(!resolved);
	const [replying, setReplying] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [first, ...replies] = thread.comments;

	async function toggle() {
		setError(null);
		const message = await setStatus(thread.id, resolved ? "open" : "resolved");
		if (message) setError(message);
	}

	return (
		<div
			className={`flex flex-col gap-2 rounded-md border p-3 text-sm ${
				resolved ? "bg-muted/40" : "bg-card"
			}`}
		>
			<div className="flex flex-wrap items-center gap-2">
				<Badge variant={resolved ? "secondary" : "outline"}>
					<Icon name={resolved ? "done" : "remark"} />
					{resolved ? "Traitée" : "Ouverte"}
				</Badge>
				{thread.orphaned && <Badge variant="outline">Élément supprimé</Badge>}
				{where && (
					<span className="text-muted-foreground text-xs">{where}</span>
				)}
				<span className="ml-auto flex items-center gap-1">
					{resolved && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setExpanded((value) => !value)}
						>
							<Icon name="expand" />
							{expanded ? "Masquer" : "Afficher"}
						</Button>
					)}
					{canWrite && (
						<Button type="button" variant="outline" size="sm" onClick={toggle}>
							<Icon name={resolved ? "retry" : "done"} />
							{resolved ? "Rouvrir" : "Marquer traitée"}
						</Button>
					)}
				</span>
			</div>

			{expanded && first && (
				<>
					{thread.quote && (
						<blockquote className="border-l-2 pl-2 text-muted-foreground text-xs italic">
							« {thread.quote} »
						</blockquote>
					)}
					<ul className="flex flex-col gap-2">
						{[first, ...replies].map((comment) => (
							<li key={comment.id}>
								<p className="text-muted-foreground text-xs">
									<span className="font-medium text-foreground">
										{comment.author}
									</span>{" "}
									· {dateFormat.format(new Date(comment.createdAt))}
								</p>
								<p className="whitespace-pre-wrap">{comment.body}</p>
							</li>
						))}
					</ul>
					{resolved && thread.resolvedBy && (
						<p className="text-muted-foreground text-xs">
							Traitée par {thread.resolvedBy}
						</p>
					)}
					{error && <FormError>{error}</FormError>}
					{canWrite &&
						(replying ? (
							<CommentForm
								placeholder="Votre réponse"
								submitLabel="Répondre"
								onSubmit={(body) => post({ parentId: thread.id, body })}
								onCancel={() => setReplying(false)}
							/>
						) : (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="self-start"
								onClick={() => setReplying(true)}
							>
								<Icon name="remark" /> Répondre
							</Button>
						))}
				</>
			)}
		</div>
	);
}

/**
 * Hangs under an element of the content: its threads and, while the revision is in review, a button to add one.
 * The text selected inside the element when the button is pressed becomes the quoted excerpt.
 */
export function Annotation({
	target,
	alwaysVisible = false,
}: {
	target: ReviewTarget;
	/** Keeps the add button visible (it only appears on hover for blocks and questions). */
	alwaysVisible?: boolean;
}) {
	const { threads, canWrite, post } = useRemarks();
	const [adding, setAdding] = useState(false);
	const [quote, setQuote] = useState("");
	const here = threads.filter((thread) => sameTarget(thread.target, target));
	if (here.length === 0 && !canWrite) return null;

	function start(event: React.MouseEvent<HTMLElement>) {
		const selection = window.getSelection();
		const scope = event.currentTarget.closest("[data-annotate]");
		const text = selection?.toString().trim() ?? "";
		const inside =
			scope && selection?.anchorNode && scope.contains(selection.anchorNode);
		setQuote(inside ? text.slice(0, 500) : "");
		setAdding(true);
	}

	return (
		<div className="my-2 flex flex-col gap-2">
			{here.map((thread) => (
				<ThreadCard key={thread.id} thread={thread} />
			))}
			{canWrite &&
				(adding ? (
					<div className="flex flex-col gap-2 rounded-md border border-dashed p-3">
						{quote && (
							<blockquote className="border-l-2 pl-2 text-muted-foreground text-xs italic">
								« {quote} »
							</blockquote>
						)}
						<CommentForm
							placeholder="Votre remarque"
							submitLabel="Publier la remarque"
							onSubmit={(body) =>
								post({ target, body, ...(quote && { quote }) })
							}
							onCancel={() => setAdding(false)}
						/>
					</div>
				) : (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						// Keeps the text selection while the button is pressed.
						onMouseDown={(event) => event.preventDefault()}
						onClick={start}
						className={`self-start text-muted-foreground ${
							alwaysVisible
								? ""
								: "sm:opacity-0 sm:transition-opacity sm:group-hover/block:opacity-100 sm:focus-visible:opacity-100"
						}`}
					>
						<Icon name="remark" /> Commenter
					</Button>
				))}
		</div>
	);
}

/** Count of open threads inside a chapter (its own, its blocks and its questions), as a small badge; nothing at zero. */
export function OpenRemarksBadge({ chapterId }: { chapterId: string }) {
	const { threads } = useRemarks();
	const count = openThreads(threads).filter(
		(thread) =>
			thread.target.type !== "revision" &&
			thread.target.chapterId === chapterId,
	).length;
	if (count === 0) return null;
	return (
		<Badge variant="outline" className="shrink-0 gap-0.5 px-1 text-[10px]">
			<Icon name="remark" className="size-3" />
			<span className="sr-only">Remarques ouvertes : </span>
			{count}
		</Badge>
	);
}
