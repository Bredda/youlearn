import { resolve } from "node:path";
import { pool, runMigrations } from "@youlearn/db";

// Run by the `migrate` service of docker/compose.prod.yml before the API starts. The folder is the first argument,
// `drizzle` (next to `dist` in the image) by default.
const folder = resolve(process.argv[2] ?? "drizzle");

try {
	await runMigrations(folder);
	console.info(`Migrations applied from ${folder}`);
} finally {
	await pool.end();
}
