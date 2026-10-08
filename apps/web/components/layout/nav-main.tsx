"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { IconName } from "@/lib/icons";

export function NavMain({
	items,
}: {
	items: {
		name: string;
		url: string;
		icon: IconName;
		/** A count shown on the entry (hidden while the sidebar is collapsed). */
		badge?: number;
	}[];
}) {
	return (
		<SidebarGroup>
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
						{item.badge !== undefined && (
							<SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
						)}
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
