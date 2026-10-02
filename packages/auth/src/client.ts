import { adminClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

// Browser-safe entry point (no server/db imports). No `baseURL`: requests go to `<current origin>/api/auth`,
// which Next.js rewrites to the API.
export const authClient = createAuthClient({ plugins: [adminClient()] });

export const { signIn, signOut, useSession } = authClient;
