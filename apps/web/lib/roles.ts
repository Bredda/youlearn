import type { Role } from "@youlearn/auth/roles";

/** Display names of the roles (the `writer` role is the trainer space). */
export const ROLE_LABELS: Record<Role, string> = {
	user: "Utilisateur",
	writer: "Formateur",
	admin: "Admin",
};
