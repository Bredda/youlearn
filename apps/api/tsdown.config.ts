import { defineConfig } from "tsdown";

export default defineConfig({
	// `migrate` is the one-shot entry point of the container that applies the migrations before the API starts.
	entry: ["src/index.ts", "src/migrate.ts"],
	format: "esm",
	platform: "node",
	// Workspace packages ship TypeScript sources: bundle them, keep third-party deps external.
	noExternal: [/^@youlearn\//],
});
