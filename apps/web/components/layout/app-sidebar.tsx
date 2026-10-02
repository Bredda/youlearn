"use client";

import {
	AiLearningIcon,
	CourseIcon,
	SchoolIcon,
	UsersIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { canWrite, isAdmin } from "@youlearn/auth/roles";
import Link from "next/link";
import type * as React from "react";
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
import type { IconSvgObject } from "@/lib/types";
import { NavWriter } from "./nav-writer";

const userItems: {
	name: string;
	url: string;
	icon: IconSvgObject;
}[] = [
	{ name: "Mon dashboard", url: "/", icon: UsersIcon },
	{ name: "Mes sessions", url: "/my-sessions", icon: CourseIcon },
	{ name: "Les parcours", url: "/programs", icon: SchoolIcon },
];

const adminItems: {
	name: string;
	url: string;
	icon: IconSvgObject;
}[] = [
	{ name: "Groupes", url: "/admin/groups", icon: UsersIcon },
	{ name: "Utilisateurs", url: "/admin/users", icon: UsersIcon },
];
const writerItems: {
	name: string;
	url: string;
	icon: IconSvgObject;
}[] = [
	{ name: "Parcours", url: "/writer/programs", icon: UsersIcon },
	{ name: "Cours", url: "/writer/courses", icon: UsersIcon },
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
								<HugeiconsIcon icon={AiLearningIcon} className="size-4" />
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
