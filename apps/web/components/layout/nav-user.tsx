"use client";

import {
	LogoutIcon,
	Moon02Icon,
	NotificationIcon,
	Sun03Icon,
	UnfoldMoreIcon,
	UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { signOut } from "@youlearn/auth/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NotificationsDialog } from "@/components/layout/notifications-dialog";
import { useThemeToggle } from "@/components/theme-provider";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { UserAvatar } from "@/components/user-avatar";
import { useUser } from "@/components/user-provider";

export function NavUser() {
	const user = useUser();
	const { isMobile } = useSidebar();
	const router = useRouter();
	const { isDark, toggle } = useThemeToggle();
	const [notificationsOpen, setNotificationsOpen] = useState(false);

	async function onLogout() {
		await signOut();
		router.replace("/auth/signin");
		router.refresh();
	}
	return (
		<>
			<SidebarMenu>
				<SidebarMenuItem>
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<SidebarMenuButton
									size="lg"
									className="aria-expanded:bg-muted"
								/>
							}
						>
							<UserAvatar user={user} />
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">{user.name}</span>
								<span className="truncate text-xs">{user.email}</span>
							</div>
							<HugeiconsIcon
								icon={UnfoldMoreIcon}
								strokeWidth={2}
								className="ml-auto size-4"
							/>
						</DropdownMenuTrigger>
						<DropdownMenuContent
							className="w-fit"
							side={isMobile ? "bottom" : "right"}
							align="end"
							sideOffset={4}
						>
							<DropdownMenuGroup>
								<DropdownMenuLabel className="p-0 font-normal">
									<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
										<UserAvatar user={user} />
										<div className="grid flex-1 text-left text-sm leading-tight">
											<span className="truncate font-medium">{user.name}</span>
											<span className="truncate text-xs">{user.email}</span>
										</div>
									</div>
								</DropdownMenuLabel>
							</DropdownMenuGroup>
							<DropdownMenuSeparator />
							<DropdownMenuGroup>
								<DropdownMenuItem render={<Link href="/me" />}>
									<HugeiconsIcon icon={UserCircleIcon} strokeWidth={2} />
									Mon profil
								</DropdownMenuItem>
								<DropdownMenuItem onClick={toggle}>
									<HugeiconsIcon
										icon={isDark ? Sun03Icon : Moon02Icon}
										strokeWidth={2}
									/>
									{isDark ? "Mode clair" : "Mode sombre"}
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => setNotificationsOpen(true)}>
									<HugeiconsIcon icon={NotificationIcon} strokeWidth={2} />
									Notifications
								</DropdownMenuItem>
							</DropdownMenuGroup>
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={onLogout}>
								<HugeiconsIcon icon={LogoutIcon} strokeWidth={2} />
								Se déconnecter
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</SidebarMenuItem>
			</SidebarMenu>
			<NotificationsDialog
				open={notificationsOpen}
				onOpenChange={setNotificationsOpen}
			/>
		</>
	);
}
