import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./client";

/** Applies the pending migrations found in `folder` (a drizzle `out` directory with its `meta/_journal.json`). */
export async function runMigrations(folder: string): Promise<void> {
	await migrate(db, { migrationsFolder: folder });
}
