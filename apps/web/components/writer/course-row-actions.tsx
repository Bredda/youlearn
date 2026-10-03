"use client";

import type { WriterCourse } from "@youlearn/types";
import Link from "next/link";
import { Icon } from "@/components/icon";
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
				<Icon name="more" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					render={<Link href={`/writer/courses/${course.id}`} />}
				>
					<Icon name="open" />
					Ouvrir
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => onAction("edit", course)}>
					<Icon name="edit" />
					Modifier
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					variant="destructive"
					onClick={() => onAction("delete", course)}
				>
					<Icon name="delete" />
					Supprimer
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
