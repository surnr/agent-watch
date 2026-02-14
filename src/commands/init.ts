import { checkbox, confirm, select } from "@inquirer/prompts"
import { createDefaultConfig, loadConfig, saveConfig } from "../config.js"
import { CONFIG_FILE_NAME, type GitHookTrigger, KNOWN_AGENT_FILES, SUPPORTED_AI_AGENTS } from "../constants.js"
import { detectAgentFiles } from "../detect.js"
import { installGitHook } from "../hooks.js"
import { findGitRoot } from "../utils/git.js"
import { logger } from "../utils/logger.js"

export async function initCommand(): Promise<void> {
	logger.title("agent-watch init")

	// 1. Check we are in a git repository
	const cwd = process.cwd()
	const gitRoot = findGitRoot(cwd)

	if (!gitRoot) {
		logger.error("Not inside a git repository. Please run this command from a git repository.")
		process.exit(1)
	}

	const projectRoot = gitRoot

	// 2. Check for existing configuration
	const existingConfig = loadConfig(projectRoot)
	if (existingConfig) {
		const overwrite = await confirm({
			message: "An existing agent-watch configuration was found. Do you want to overwrite it?",
			default: false,
		})
		if (!overwrite) {
			logger.info("Init cancelled. Existing configuration preserved.")
			return
		}
	}

	// 3. Detect existing agent files
	logger.step("Scanning for agent configuration files...")
	const detectedFiles = detectAgentFiles(projectRoot)
	const existingFiles = detectedFiles.filter((f) => f.exists)

	if (existingFiles.length > 0) {
		logger.info(`Found ${existingFiles.length} existing agent file(s):`)
		for (const file of existingFiles) {
			logger.info(`  - ${file.pattern.path}`)
		}
	} else {
		logger.info("No existing agent configuration files found.")
	}

	logger.blank()

	// 4. Ask which agent files to manage
	const selectedFiles = await checkbox({
		message: "Which agent files should agent-watch manage? (space to toggle, enter to proceed)",
		choices: KNOWN_AGENT_FILES.map((pattern) => {
			const detected = detectedFiles.find((d) => d.pattern.path === pattern.path)
			const exists = detected?.exists ?? false
			return {
				name: exists ? `${pattern.label} (exists)` : pattern.label,
				value: pattern.path,
				checked: exists,
			}
		}),
	})

	if (selectedFiles.length === 0) {
		logger.warn("No files selected. You can re-run 'agent-watch init' to configure.")
		return
	}

	// 5. Ask about git context usage
	const useGitContext = await confirm({
		message: "Use git commit messages and chat sessions for updating agent files?",
		default: true,
	})

	// 6. Ask about hook trigger
	const hookTrigger = await select<GitHookTrigger>({
		message: "When should agent-watch trigger?",
		choices: [
			{ name: "After git commit (post-commit hook)", value: "commit" as const },
			{ name: "Before git push (pre-push hook)", value: "push" as const },
		],
		default: "commit" as const,
	})

	// 7. Ask which AI agents to configure
	const selectedAgents = await checkbox({
		message: "Which AI agents would you like to configure? (more coming soon)",
		choices: SUPPORTED_AI_AGENTS.map((agent) => ({
			name: agent.name,
			value: agent.value,
			checked: true,
		})),
	})

	// 8. Build and save configuration
	const config = createDefaultConfig({
		agentFiles: selectedFiles,
		useGitContext,
		hookTrigger,
		agents: selectedAgents,
	})

	logger.blank()
	logger.step("Saving configuration...")
	saveConfig(projectRoot, config)
	logger.success(`Configuration saved to ${CONFIG_FILE_NAME}`)

	// 9. Install git hook
	logger.step("Setting up git hook...")
	const hookResult = installGitHook(projectRoot, gitRoot, hookTrigger)

	if (hookResult.success) {
		if (hookResult.method === "lefthook" || hookResult.method === "husky") {
			logger.warn(hookResult.message)
		} else {
			logger.success(hookResult.message)
		}
	} else {
		logger.error(hookResult.message)
	}

	// 10. Summary
	logger.blank()
	logger.title("Setup complete!")
	logger.info("Configuration summary:")
	logger.info(`  Agent files: ${selectedFiles.join(", ")}`)
	logger.info(`  Git context: ${useGitContext ? "enabled" : "disabled"}`)
	logger.info(`  Hook trigger: ${hookTrigger}`)
	logger.info(`  AI agents: ${selectedAgents.join(", ")}`)
	logger.blank()
}
