/// <reference types="vitest" />
import { defineConfig } from "vitest/config"

export default defineConfig({
	test: {
		setupFiles: ["./tests/setup.ts"],
		environment: "node",
		globals: true,

		coverage: {
			all: false,
			provider: "v8",
			reporter: ["json-summary", "html"],
			exclude: ["src/cli.ts"],
			thresholds: {
				statements: 60,
				branches: 60,
				functions: 60,
				lines: 60,
			},
		},
	},
})
