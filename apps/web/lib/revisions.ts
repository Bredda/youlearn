import type { RevisionStatus } from "@youlearn/types";

export const REVISION_STATUS_LABELS: Record<RevisionStatus, string> = {
	draft: "Brouillon",
	preview: "Relecture",
	published: "Publiée",
	deprecated: "Dépréciée",
};

export const REVISION_STATUS_VARIANTS: Record<
	RevisionStatus,
	"default" | "secondary" | "outline" | "destructive"
> = {
	draft: "outline",
	preview: "secondary",
	published: "default",
	deprecated: "destructive",
};
