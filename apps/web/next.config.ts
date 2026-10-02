import { env } from "@youlearn/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	agentRules: false,
	// Workspace packages ship TypeScript sources.
	transpilePackages: [
		"@youlearn/auth",
		"@youlearn/config",
		"@youlearn/db",
		"@youlearn/events",
		"@youlearn/types",
	],
	// The browser only talks to the web origin; `/api/*` (Better Auth, ...) is proxied to the Fastify API.
	// This keeps session cookies first-party and avoids CORS.
	async rewrites() {
		return [
			{ source: "/api/:path*", destination: `${env.API_URL}/api/:path*` },
		];
	},
};

export default nextConfig;
