import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { CONFIG_FILE_NAME, type GitHookTrigger } from "./constants.js"

export interface AgentWatchConfig {
	/** Version of the config schema */
	version: 1
	/** Relative paths to the agent files being managed */
	agentFiles: string[]
	/** Whether to use git commit messages and chat sessions for context */
	useGitContext: boolean
	/** Which git hook triggers the update */
	hookTrigger: GitHookTrigger
	/** Which AI agent integrations to configure */
	agents: string[]
}

/**
 * Load the agent-watch configuration from the project root.
 * Returns null if no config file exists or is invalid.
 */
export function loadConfig(projectRoot: string): AgentWatchConfig | null {
	const configPath = join(projectRoot, CONFIG_FILE_NAME)
	if (!existsSync(configPath)) {
		return null
	}
	try {
		const raw = readFileSync(configPath, "utf-8")
		return JSON.parse(raw) as AgentWatchConfig
	} catch {
		return null
	}
}

/**
 * Save the agent-watch configuration to the project root.
 */
export function saveConfig(projectRoot: string, config: AgentWatchConfig): void {
	const configPath = join(projectRoot, CONFIG_FILE_NAME)
	writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf-8")
}

/**
 * Create a default configuration with optional overrides.
 */
export function createDefaultConfig(overrides: Partial<AgentWatchConfig> = {}): AgentWatchConfig {
	return {
		version: 1,
		agentFiles: [],
		useGitContext: true,
		hookTrigger: "commit",
		agents: [],
		...overrides,
	}
}
