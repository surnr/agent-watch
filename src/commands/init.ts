import { checkbox, confirm, select } from "@inquirer/prompts"
import { createDefaultConfig, loadConfig, saveConfig } from "../config.js"
import {
	AGENT_WATCH_DIR,
	FILE_SELECTION_PAGE_SIZE,
	type GitHookTrigger,
	KNOWN_AGENT_FILES,
	SUPPORTED_AI_AGENTS,
} from "../constants.js"
import { detectAgentFiles } from "../detect.js"
import { installGitHook } from "../hooks.js"
import { createMissingAgentFiles, setupGithubCopilotCli } from "../utils/copilot.js"
import { findGitRoot } from "../utils/git.js"
import { addToGitignore } from "../utils/gitignore.js"
import { logger } from "../utils/logger.js"

export async function initCommand(): Promise<void> {
	logger.asciiArt()

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
	const detectedFiles = detectAgentFiles(projectRoot)
	const existingFiles = detectedFiles.filter((f) => f.exists)

	if (existingFiles.length > 0) {
		logger.success(`Found ${existingFiles.length} existing agent file(s)`)
	}

	// 4. Ask which agent files to manage
	const selectedFiles = await checkbox({
		message: "Which agent files should agent-watch manage?",
		pageSize: FILE_SELECTION_PAGE_SIZE,
		choices: KNOWN_AGENT_FILES.map((pattern) => {
			const detected = detectedFiles.find((d) => d.pattern.path === pattern.path)
			const exists = detected?.exists ?? false
			return {
				name: exists ? `  ${pattern.label} ✓` : `  ${pattern.label}`,
				value: pattern.path,
				checked: exists,
			}
		}),
	})

	if (selectedFiles.length === 0) {
		logger.warn("No files selected. You can re-run 'agent-watch init' to configure.")
		return
	}

	// 4b. Create missing agent files using Copilot CLI
	createMissingAgentFiles(projectRoot, selectedFiles, detectedFiles)

	// 5. Ask about context options
	const contextOptions = await checkbox({
		message: "What should agent-watch track?",
		choices: [
			{
				name: "  File changes (git diff, modified files)",
				value: "watchFileChanges",
				checked: true,
			},
			{
				name: "  Chat sessions (Copilot conversation context)",
				value: "includeChatSession",
				checked: true,
			},
		],
	})

	const watchFileChanges = contextOptions.includes("watchFileChanges")
	const includeChatSession = contextOptions.includes("includeChatSession")

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
		message: "Which AI agents would you like to configure?",
		choices: SUPPORTED_AI_AGENTS.map((agent) => ({
			name: `  ${agent.name}`,
			value: agent.value,
			checked: true,
		})),
	})

	// 8. Setup GitHub Copilot CLI if selected
	if (selectedAgents.includes("github-copilot-cli")) {
		const setupSuccess = await setupGithubCopilotCli()
		if (!setupSuccess) {
			logger.warn("Copilot CLI setup incomplete. You can set it up manually later.")
		}
	}

	// 9. Build and save configuration
	const config = createDefaultConfig({
		agentFiles: selectedFiles,
		watchFileChanges,
		includeChatSession,
		hookTrigger,
		agents: selectedAgents,
	})

	saveConfig(projectRoot, config)

	// 9b. Add .agent-watch directory to .gitignore
	addToGitignore(projectRoot, [AGENT_WATCH_DIR])

	// 10. Install git hook
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

	// 11. Summary
	logger.blank()
	logger.success("Setup complete!")
	logger.info(`Files: ${selectedFiles.join(", ")} • Hook: ${hookTrigger} • Agents: ${selectedAgents.join(", ")}`)
	logger.blank()
}
