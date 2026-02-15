import { homedir } from "node:os"
import { join } from "node:path"

/**
 * Get VS Code workspace storage directory based on platform
 */
export function getVSCodeWorkspaceStorageDir(): string {
	const platform = process.platform

	if (platform === "darwin") {
		return join(homedir(), "Library", "Application Support", "Code", "User", "workspaceStorage")
	}

	if (platform === "win32") {
		return join(homedir(), "AppData", "Roaming", "Code", "User", "workspaceStorage")
	}

	// Linux
	return join(homedir(), ".config", "Code", "User", "workspaceStorage")
}

/**
 * Convert project path to Claude Code project hash
 * Example: /Users/name/project → -Users-name-project
 */
export function projectPathToClaudeHash(projectPath: string): string {
	return projectPath.replace(/^\//, "").replace(/\//g, "-")
}

/**
 * Escape a prompt string for safe shell execution
 * Handles quotes and newlines
 */
export function escapePrompt(prompt: string): string {
	return prompt.replaceAll('"', '\\"').replaceAll("\n", "\\n")
}

/**
 * Truncate text to maximum length, adding ellipsis if truncated
 */
export function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text
	return `${text.slice(0, maxLength - 3)}...`
}
