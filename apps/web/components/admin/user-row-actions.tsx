"use client";

import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { AdminUser } from "@youlearn/types";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type UserAction = "edit" | "password" | "ban" | "unban" | "delete";

export function UserRowActions({
	user,
	isSelf,
	onAction,
}: {
	user: AdminUser;
	/** You cannot ban or delete yourself. */
	isSelf: boolean;
	onAction: (action: UserAction, user: AdminUser) => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label={`Actions pour ${user.name}`}
					/>
				}
			>
				<HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={() => onAction("edit", user)}>
					Modifier
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => onAction("password", user)}>
					Changer le mot de passe
				</DropdownMenuItem>
				{!isSelf && (
					<>
						<DropdownMenuSeparator />
						{user.banned ? (
							<DropdownMenuItem onClick={() => onAction("unban", user)}>
								Débannir
							</DropdownMenuItem>
						) : (
							<DropdownMenuItem onClick={() => onAction("ban", user)}>
								Bannir
							</DropdownMenuItem>
						)}
						<DropdownMenuItem
							variant="destructive"
							onClick={() => onAction("delete", user)}
						>
							Supprimer
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
