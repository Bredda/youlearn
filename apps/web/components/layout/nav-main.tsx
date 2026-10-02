"use client";

import { HugeiconsIcon } from "@hugeicons/react";

import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { IconSvgObject } from "@/lib/types";

export function NavMain({
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
