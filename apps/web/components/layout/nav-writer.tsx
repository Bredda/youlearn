"use client";

import { HugeiconsIcon } from "@hugeicons/react";

import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { IconSvgObject } from "@/lib/types";

export function NavWriter({
	items,
}: {
	items: {
		name: string;
		url: string;
		icon: IconSvgObject;
	}[];
}) {
	return (
		<SidebarGroup>
			<SidebarGroupLabel>Formateur</SidebarGroupLabel>
			<SidebarMenu>
				{items.map((item) => (
					<SidebarMenuItem key={item.name}>
						<SidebarMenuButton render={<a href={item.url} />}>
							<HugeiconsIcon icon={item.icon} />
							<span>{item.name}</span>
						</SidebarMenuButton>
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
