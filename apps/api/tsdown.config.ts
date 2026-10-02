import { defineConfig } from "tsdown";

export default defineConfig({
	entry: ["src/index.ts"],
	format: "esm",
	platform: "node",
	// Workspace packages ship TypeScript sources: bundle them, keep third-party deps external.
	noExternal: [/^@youlearn\//],
});
