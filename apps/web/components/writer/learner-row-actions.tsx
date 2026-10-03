"use client";

import type { CourseEnrollment } from "@youlearn/types";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type LearnerAction = "details";

export function LearnerRowActions({
	enrollment,
	onAction,
}: {
	enrollment: CourseEnrollment;
	onAction: (action: LearnerAction, enrollment: CourseEnrollment) => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label={`Actions pour ${enrollment.learner.name}`}
					/>
				}
			>
				<Icon name="more" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={() => onAction("details", enrollment)}>
					<Icon name="view" />
					Voir le détail
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
