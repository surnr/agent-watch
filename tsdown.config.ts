import { defineConfig } from "tsdown"

export default defineConfig({
	entry: ["src/index.ts", "src/cli.ts"],
	sourcemap: true,
	dts: false,
	minify: false,
	clean: false,
	format: ["esm", "cjs"],
	outDir: "dist",
})
