"use client";

import { Icon } from "@/components/icon";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { IconName } from "@/lib/icons";

export function NavWriter({
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
			<SidebarGroupLabel>Formateur</SidebarGroupLabel>
			<SidebarMenu>
				{items.map((item) => (
					<SidebarMenuItem key={item.name}>
						<SidebarMenuButton render={<a href={item.url} />}>
							<Icon name={item.icon} />
							<span>{item.name}</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
