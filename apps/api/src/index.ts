import { ensureAdminUser } from "@youlearn/auth";
import { env } from "@youlearn/config";
import { pool } from "@youlearn/db";
import { ensureBucket } from "@youlearn/storage";
import { buildApp } from "./app";
import { startAssetSweeper } from "./lib/asset-sweep";
import { ensureCommonGroup, ensureDefaultGroups } from "./lib/groups";

const app = await buildApp();

// First install: create the admin described by ADMIN_* env vars (no-op when unset or already present).
await ensureAdminUser(app.log);
await ensureDefaultGroups(app.log);
await ensureCommonGroup(app.log);
await ensureBucket(app.log);

let stopSweeper: (() => void) | undefined;

for (const signal of ["SIGINT", "SIGTERM"] as const) {
	process.once(signal, async () => {
		stopSweeper?.();
		await app.close();
		await pool.end();
		process.exit(0);
	});
}

try {
	await app.listen({ host: env.API_HOST, port: env.API_PORT });
	stopSweeper = startAssetSweeper(app.log);
} catch (error) {
	app.log.error(error);
	process.exit(1);
}
