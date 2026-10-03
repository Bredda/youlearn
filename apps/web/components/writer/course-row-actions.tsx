"use client";

import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { WriterCourse } from "@youlearn/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type CourseAction = "edit" | "delete";

export function CourseRowActions({
	course,
	onAction,
}: {
	course: WriterCourse;
	onAction: (action: CourseAction, course: WriterCourse) => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label={`Actions pour ${course.name}`}
					/>
				}
			>
				<HugeiconsIcon icon={MoreHorizontalIcon} strokeWidth={2} />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					render={<Link href={`/writer/courses/${course.id}`} />}
				>
					Ouvrir
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => onAction("edit", course)}>
					Modifier
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					variant="destructive"
					onClick={() => onAction("delete", course)}
				>
					Supprimer
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
