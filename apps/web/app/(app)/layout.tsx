import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeader } from "@/components/layout/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { UserProvider } from "@/components/user-provider";
import { getCurrentUser } from "@/lib/session";

export default async function AppLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const user = await getCurrentUser();
	if (!user) redirect("/auth/signin");

	// The provider writes this cookie on toggle; reading it keeps the state across full page loads.
	const sidebarOpen = (await cookies()).get("sidebar_state")?.value !== "false";

	return (
		<UserProvider user={user}>
			<SidebarProvider
				defaultOpen={sidebarOpen}
				className="flex-col [--header-height:calc(--spacing(14))]"
			>
				<SiteHeader />
				<div className="flex flex-1">
					<AppSidebar />
					<SidebarInset>
						<div className="flex flex-1 flex-col gap-4 p-4">{children}</div>
					</SidebarInset>
				</div>
			</SidebarProvider>
		</UserProvider>
	);
}
