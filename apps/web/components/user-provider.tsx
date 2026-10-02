"use client";

import type { PublicUser } from "@youlearn/types";
import { createContext, useContext } from "react";

const UserContext = createContext<PublicUser | null>(null);

/**
 * Makes the authenticated user (resolved once by the server layout) available to any client component
 * below it through `useUser()`. After a change to the user, `router.refresh()` re-runs the layout
 * and the provider receives the fresh value.
 */
export function UserProvider({
	user,
	children,
}: {
	user: PublicUser;
	children: React.ReactNode;
}) {
	return <UserContext value={user}>{children}</UserContext>;
}

export function useUser(): PublicUser {
	const user = useContext(UserContext);
	if (!user) throw new Error("useUser must be used within a <UserProvider>");
	return user;
}
