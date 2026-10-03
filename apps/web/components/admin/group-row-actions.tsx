"use client";

import type { GroupWithMemberCount } from "@youlearn/types";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type GroupAction = "rename" | "delete";

/** The built-in "Commun" group can be neither renamed nor deleted: it has no menu. */
export function GroupRowActions({
	group,
	onAction,
}: {
	group: GroupWithMemberCount;
	onAction: (action: GroupAction, group: GroupWithMemberCount) => void;
}) {
	if (group.system) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label={`Actions pour ${group.name}`}
					/>
				}
			>
				<Icon name="more" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={() => onAction("rename", group)}>
					<Icon name="edit" />
					Renommer
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					variant="destructive"
					onClick={() => onAction("delete", group)}
				>
					<Icon name="delete" />
					Supprimer
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
