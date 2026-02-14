#!/usr/bin/env node
import { createRequire } from "node:module"
import { program } from "commander"
import { initCommand } from "./commands/init.js"
import { runCommand } from "./commands/run.js"

const require = createRequire(import.meta.url)
const { version } = require("../package.json") as { version: string }

program
	.name("agent-watch")
	.description("Keep your AI agent configuration files in sync with your codebase")
	.version(version)

program
	.command("init")
	.description("Initialize agent-watch in the current project")
	.action(async () => {
		await initCommand()
	})

program
	.command("run")
	.description("Update agent files with recent changes and chat sessions")
	.action(async () => {
		await runCommand()
	})

program.parse()
