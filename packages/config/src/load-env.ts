import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const WORKSPACE_MARKER = "pnpm-workspace.yaml";

/** Walks up from `from` to the directory holding the pnpm workspace file. */
export function findWorkspaceRoot(from = process.cwd()): string | undefined {
	let dir = resolve(from);
	while (true) {
		if (existsSync(join(dir, WORKSPACE_MARKER))) return dir;
		const parent = dirname(dir);
		if (parent === dir) return undefined;
		dir = parent;
	}
}

/**
 * Loads `<workspace root>/.env` into `process.env`.
 * Variables already present in the environment win over the file, and a missing file is fine
 * (production containers inject variables directly).
 */
export function loadRootEnv(): void {
	const root = findWorkspaceRoot();
	if (!root) return;
	const file = join(root, ".env");
	if (existsSync(file)) process.loadEnvFile(file);
}
