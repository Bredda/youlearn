"use client";

import { canWrite, isAdmin } from "@youlearn/auth/roles";
import Link from "next/link";
import type * as React from "react";
import { Icon } from "@/components/icon";
import { NavAdmin } from "@/components/layout/nav-admin";
import { NavMain } from "@/components/layout/nav-main";
import { NavUser } from "@/components/layout/nav-user";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";
import { useUser } from "@/components/user-provider";
import type { IconName } from "@/lib/icons";
import { NavWriter } from "./nav-writer";

const userItems: {
	name: string;
	url: string;
	icon: IconName;
}[] = [
	{ name: "Mon dashboard", url: "/", icon: "dashboard" },
	{ name: "Mes sessions", url: "/my-sessions", icon: "sessions" },
	{ name: "Les parcours", url: "/programs", icon: "programs" },
];

const adminItems: {
	name: string;
	url: string;
	icon: IconName;
}[] = [
	{ name: "Groupes", url: "/admin/groups", icon: "groups" },
	{ name: "Utilisateurs", url: "/admin/users", icon: "users" },
	{ name: "Événements", url: "/admin/events", icon: "events" },
];
const writerItems: {
	name: string;
	url: string;
	icon: IconName;
}[] = [
	{ name: "Parcours", url: "/writer/programs", icon: "programs" },
	{ name: "Cours", url: "/writer/courses", icon: "courses" },
];
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const user = useUser();

	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton size="lg" render={<Link href="/" />}>
							<div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
								<Icon name="brand" className="size-4" />
							</div>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">YouLearn</span>
								<span className="truncate text-xs">Enterprise</span>
							</div>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={userItems} />
				{isAdmin(user.roles) && <NavAdmin items={adminItems} />}
				{canWrite(user.roles) && <NavWriter items={writerItems} />}
			</SidebarContent>
			<SidebarFooter>
				<NavUser />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
