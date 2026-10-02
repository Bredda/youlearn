// An unknown token and one that ended (the revision left the review, or the link was revoked) look the same.
export default function ReviewNotFound() {
	return (
		<div className="flex flex-col gap-2">
			<h1 className="font-semibold text-xl">Lien de relecture invalide</h1>
			<p className="text-muted-foreground text-sm">
				Ce lien n'existe pas ou n'est plus valide : la révision n'est plus en
				relecture, ou son lien a été remplacé. Demandez un nouveau lien à
				l'auteur du cours.
			</p>
		</div>
	);
}
