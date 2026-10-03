"use client";

import type { AdminUser } from "@youlearn/types";
import { Icon } from "@/components/icon";
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
				<Icon name="more" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={() => onAction("edit", user)}>
					<Icon name="edit" />
					Modifier
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => onAction("password", user)}>
					<Icon name="password" />
					Changer le mot de passe
				</DropdownMenuItem>
				{!isSelf && (
					<>
						<DropdownMenuSeparator />
						{user.banned ? (
							<DropdownMenuItem onClick={() => onAction("unban", user)}>
								<Icon name="unban" />
								Débannir
							</DropdownMenuItem>
						) : (
							<DropdownMenuItem onClick={() => onAction("ban", user)}>
								<Icon name="ban" />
								Bannir
							</DropdownMenuItem>
						)}
						<DropdownMenuItem
							variant="destructive"
							onClick={() => onAction("delete", user)}
						>
							<Icon name="delete" />
							Supprimer
						</DropdownMenuItem>
					</>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
