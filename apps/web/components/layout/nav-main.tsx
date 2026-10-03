"use client";

import Link from "next/link";
import { Icon } from "@/components/icon";
import {
	SidebarGroup,
	SidebarMenu,
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
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
