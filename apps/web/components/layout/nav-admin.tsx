"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { IconName } from "@/lib/icons";

export function NavAdmin({
	items,
}: {
	items: {
		name: string;
		url: string;
		icon: IconName;
	}[];
}) {
	return (
		<SidebarGroup>
			<SidebarGroupLabel>Admin</SidebarGroupLabel>
			<SidebarMenu>
				{items.map((item) => (
					<SidebarMenuItem key={item.name}>
						<SidebarMenuButton
							render={<Link href={item.url} />}
							tooltip={item.name}
						>
							<Icon name={item.icon} />
							<span>{item.name}</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
