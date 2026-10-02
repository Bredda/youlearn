import { env } from "@youlearn/config";
import { pool } from "@youlearn/db";
import { ensureAdminUser } from "../src/seed-admin";

try {
	const result = await ensureAdminUser();
	if (result === "disabled")
		console.warn("ADMIN_EMAIL / ADMIN_PASSWORD are not set: nothing to do.");
	if (result === "exists")
		console.info(`Admin ${env.ADMIN_EMAIL} already exists.`);
} finally {
	await pool.end();
}
