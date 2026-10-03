import { join } from "node:path";
import { env } from "@youlearn/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	agentRules: false,
	// Self-contained server for the Docker image; the workspace root is where the monorepo's packages are traced from.
	output: "standalone",
	outputFileTracingRoot: join(import.meta.dirname, "../.."),
	// Workspace packages ship TypeScript sources.
	transpilePackages: [
		"@youlearn/content",
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
