import { env } from "@youlearn/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "postgresql",
	schema: "./src/schema/index.ts",
	out: "./drizzle",
	casing: "snake_case",
	dbCredentials: { url: env.DATABASE_URL },
});
