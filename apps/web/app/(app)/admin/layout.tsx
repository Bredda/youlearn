import { isAdmin } from "@youlearn/auth/roles";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

// Everything under /admin is reserved to admins (the API enforces it too, this just keeps the pages out of reach).
export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const user = await getCurrentUser();
	if (!user || !isAdmin(user.roles)) redirect("/");

	return children;
}
