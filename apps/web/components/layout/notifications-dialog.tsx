"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

export function NotificationsDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Notifications</DialogTitle>
					<DialogDescription>
						Aucune notification pour le moment.
					</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	);
}
