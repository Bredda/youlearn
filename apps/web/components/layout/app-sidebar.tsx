"use client";

import { canWrite, isAdmin } from "@youlearn/auth/roles";
import type * as React from "react";
import { NavAdmin } from "@/components/layout/nav-admin";
import { NavMain } from "@/components/layout/nav-main";
import { NavUser } from "@/components/layout/nav-user";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
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
	{ name: "Les cours", url: "/courses", icon: "courses" },
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
		<Sidebar
			collapsible="icon"
			className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
			{...props}
		>
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
