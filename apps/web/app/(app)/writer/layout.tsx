import { canWrite } from "@youlearn/auth/roles";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

// The writer area is open to writers and admins (the API enforces it too, this just keeps the pages out of reach).
export default async function WriterLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const user = await getCurrentUser();
	if (!user || !canWrite(user.roles)) redirect("/");

	return children;
}
