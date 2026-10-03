import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/session";

export default async function HomePage() {
	const user = await getCurrentUser();

	return (
		<PageHeader
			title={`Welcome${user ? `, ${user.name}` : ""}`}
			description="You are signed in."
		/>
	);
}
