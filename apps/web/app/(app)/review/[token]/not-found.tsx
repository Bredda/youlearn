import { PageHeader } from "@/components/page-header";

// An unknown token and one that ended (the revision left the review, or the link was revoked) look the same.
export default function ReviewNotFound() {
	return (
		<PageHeader
			title="Lien de relecture invalide"
			description="Ce lien n'existe pas ou n'est plus valide : la révision n'est plus en relecture, ou son lien a été remplacé. Demandez un nouveau lien à l'auteur du cours."
		/>
	);
}
