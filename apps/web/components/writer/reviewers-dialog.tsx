"use client";

import type { ReviewerRef, WriterRevision } from "@youlearn/types";
import { useEffect, useState } from "react";
import { FormError } from "@/components/form-error";
import { Icon, PendingIcon } from "@/components/icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { callApi, fetchApi } from "@/lib/api-client";

/**
 * Chooses who reviews a revision. From a draft ("send"), the choice is kept here and goes with the status change;
 * once the revision is in review ("manage"), each add or removal is applied right away. Mounted only while open,
 * so the state starts fresh each time.
 */
export function ReviewersDialog({
	courseId,
	revision,
	onClose,
	onDone,
}: {
	courseId: string;
	revision: WriterRevision;
	onClose: () => void;
	/** The revision was sent to review or its reviewers changed: the page must refresh its data. */
	onDone: () => void;
}) {
	const sending = revision.status === "draft";
	const api = `/api/writer/courses/${courseId}/revisions/${revision.id}`;
	const [selected, setSelected] = useState<ReviewerRef[]>(revision.reviewers);
	const [search, setSearch] = useState("");
	const [candidates, setCandidates] = useState<ReviewerRef[]>([]);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string>();

	const excluded = selected.map((r) => r.userId).join(",");
	useEffect(() => {
		let cancelled = false;
		const timer = setTimeout(async () => {
			const { data } = await fetchApi<{ users: ReviewerRef[] }>(
				"GET",
				`/api/writer/reviewer-candidates?q=${encodeURIComponent(search)}&exclude=${excluded}`,
			);
			if (!cancelled && data) setCandidates(data.users);
		}, 250);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [search, excluded]);

	/** Applies the change on the server when the revision is already in review, locally otherwise. */
	async function change(user: ReviewerRef, add: boolean) {
		setError(undefined);
		if (sending) {
			setSelected((current) =>
				add
					? [...current, user]
					: current.filter((r) => r.userId !== user.userId),
			);
			return;
		}
		setPending(true);
		const result = await fetchApi<{ revision: WriterRevision }>(
			add ? "POST" : "DELETE",
			add ? `${api}/reviewers` : `${api}/reviewers/${user.userId}`,
			add ? { userId: user.userId } : undefined,
		);
		setPending(false);
		if (result.data === null) return setError(result.error);
		setSelected(result.data.revision.reviewers);
		onDone();
	}

	async function send() {
		setPending(true);
		setError(undefined);
		const message = await callApi("POST", `${api}/status`, {
			to: "preview",
			reviewerIds: selected.map((r) => r.userId),
		});
		setPending(false);
		if (message) return setError(message);
		onDone();
	}

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{sending ? "Envoyer en relecture" : "Relecteurs"} · {revision.key}
					</DialogTitle>
					<DialogDescription>
						Les personnes choisies lisent cette révision depuis leur menu «
						Relectures », tant qu'elle est en relecture. Vous pouvez continuer à
						la modifier pendant ce temps.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-2">
					<p className="font-medium text-sm">Relecteurs choisis</p>
					{selected.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							Personne pour l'instant.
						</p>
					) : (
						<ul className="flex flex-wrap gap-2">
							{selected.map((user) => (
								<li key={user.userId}>
									<Badge variant="secondary" className="gap-1 pr-1">
										{user.name}
										<Button
											type="button"
											variant="ghost"
											size="icon-xs"
											disabled={pending}
											aria-label={`Retirer ${user.name}`}
											onClick={() => change(user, false)}
										>
											<Icon name="cancel" />
										</Button>
									</Badge>
								</li>
							))}
						</ul>
					)}
				</div>

				<div className="flex flex-col gap-2">
					<Input
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Rechercher un utilisateur par nom ou email"
						aria-label="Rechercher un relecteur"
					/>
					<ul className="flex max-h-48 flex-col overflow-y-auto rounded-md border">
						{candidates.length === 0 && (
							<li className="px-3 py-2 text-muted-foreground text-sm">
								Aucun utilisateur trouvé.
							</li>
						)}
						{candidates.map((user) => (
							<li
								key={user.userId}
								className="flex items-center justify-between gap-2 border-b px-3 py-1.5 last:border-b-0"
							>
								<span className="min-w-0 text-sm">
									<span className="block truncate">{user.name}</span>
									<span className="block truncate text-muted-foreground text-xs">
										{user.email}
									</span>
								</span>
								<Button
									type="button"
									variant="outline"
									disabled={pending}
									onClick={() => change(user, true)}
								>
									<Icon name="add" /> Ajouter
								</Button>
							</li>
						))}
					</ul>
				</div>

				{error && <FormError>{error}</FormError>}
				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						{sending ? "Annuler" : "Fermer"}
					</Button>
					{sending && (
						<Button disabled={pending || selected.length === 0} onClick={send}>
							<PendingIcon pending={pending} name="preview" />
							Envoyer en relecture
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
