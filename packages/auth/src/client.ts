import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { accessControl, roleDefinitions } from "./roles";

// Browser-safe entry point (no server/db imports). No `baseURL`: requests go to `<current origin>/api/auth`,
// which Next.js rewrites to the API.
export const authClient = createAuthClient({
	plugins: [adminClient({ ac: accessControl, roles: roleDefinitions })],
});

export const { signIn, signOut, useSession } = authClient;
