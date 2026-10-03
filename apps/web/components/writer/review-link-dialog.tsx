"use client";

import type { WriterRevision } from "@youlearn/types";
import { useState } from "react";
import { FormError } from "@/components/form-error";
import { Icon, PendingIcon } from "@/components/icon";
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

// Mounted only while open, so the state starts fresh each time.
export function ReviewLinkDialog({
	courseId,
	webUrl,
	revision,
	onClose,
	onChanged,
}: {
	courseId: string;
	/** Public origin of the app: the link must not depend on the author's browser. */
	webUrl: string;
	revision: WriterRevision;
	onClose: () => void;
	/** The link was replaced or revoked: the page must refresh its data. */
	onChanged: () => void;
}) {
	const [token, setToken] = useState(revision.previewToken);
	const [pending, setPending] = useState(false);
	const [copied, setCopied] = useState(false);
	const [error, setError] = useState<string>();

	const url = token ? `${new URL(webUrl).origin}/review/${token}` : "";

	async function change(method: "POST" | "DELETE") {
		setPending(true);
		setError(undefined);
		setCopied(false);
		const response = await fetch(
			`/api/writer/courses/${courseId}/revisions/${revision.id}/preview-link`,
			{ method },
		);
		setPending(false);
		if (!response.ok) {
			const data = (await response.json().catch(() => null)) as {
				error?: string;
			} | null;
			return setError(data?.error ?? "Une erreur est survenue");
		}
		const { revision: updated } = (await response.json()) as {
			revision: WriterRevision;
		};
		setToken(updated.previewToken);
		onChanged();
	}

	async function copy() {
		await navigator.clipboard.writeText(url);
		setCopied(true);
	}

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Lien de relecture · {revision.key}</DialogTitle>
					<DialogDescription>
						Toute personne connectée qui a ce lien peut lire cette révision. Le
						lien cesse de fonctionner dès que la révision quitte la relecture.
					</DialogDescription>
				</DialogHeader>
				{token ? (
					<div className="flex gap-2">
						<Input
							readOnly
							value={url}
							onFocus={(e) => e.currentTarget.select()}
							aria-label="Lien de relecture"
						/>
						<Button type="button" variant="outline" onClick={copy}>
							<Icon name={copied ? "copied" : "copy"} />
							{copied ? "Copié" : "Copier"}
						</Button>
					</div>
				) : (
					<p className="text-muted-foreground text-sm">Aucun lien actif.</p>
				)}
				{error && <FormError>{error}</FormError>}
				<DialogFooter>
					{token && (
						<Button
							variant="destructive"
							disabled={pending}
							onClick={() => change("DELETE")}
						>
							<Icon name="delete" />
							Révoquer
						</Button>
					)}
					<Button disabled={pending} onClick={() => change("POST")}>
						<PendingIcon pending={pending} name="link" />
						{token ? "Générer un nouveau lien" : "Générer un lien"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
