import { PageHeader } from "@/components/page-header";

// A revision that is not yours to review and one whose review is over look the same.
export default function ReviewNotFound() {
	return (
		<PageHeader
			title="Relecture introuvable"
			description="Cette relecture n'existe pas, ne vous est pas confiée ou est terminée : la révision n'est plus en relecture."
		/>
	);
}
