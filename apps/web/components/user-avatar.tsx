import type { PublicUser } from "@youlearn/types";
import type * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function initials(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");
}

export function UserAvatar({
	user,
	...props
}: { user: Pick<PublicUser, "name" | "image"> } & React.ComponentProps<
	typeof Avatar
>) {
	return (
		<Avatar {...props}>
			<AvatarImage src={user.image ?? undefined} alt={user.name} />
			<AvatarFallback>{initials(user.name)}</AvatarFallback>
		</Avatar>
	);
}
