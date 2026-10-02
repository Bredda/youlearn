import { getCurrentUser } from "@/lib/session";

export default async function HomePage() {
	const user = await getCurrentUser();

	return (
		<>
			<h1 className="font-semibold text-xl">
				Welcome{user ? `, ${user.name}` : ""}
			</h1>
			<p className="mt-2 text-muted-foreground text-sm">You are signed in.</p>
		</>
	);
}
