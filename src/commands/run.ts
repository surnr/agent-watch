import { execSync } from "node:child_process"
import { join } from "node:path"
import { loadConfig } from "../config.js"
import { IGNORED_FILE_PATTERNS } from "../constants.js"
import { logContext, logCopilotPrompt, logCopilotResponse, setDebugMode } from "../utils/debug.js"
import { findGitRoot } from "../utils/git.js"
import { logger } from "../utils/logger.js"
import { processAllSessions } from "../utils/sessions/index.js"

/**
 * Get git commit message
 */
function getCommitMessage(): string {
	try {
		const message = execSync("git log -1 --pretty=%B", {
			encoding: "utf-8",
			stdio: "pipe",
		})
		return message.trim()
	} catch {
		return ""
	}
}

/**
 * Get git diff stats (summary, not full diff)
 */
function getGitDiffStats(): string {
	try {
		const stats = execSync("git diff HEAD~1..HEAD --stat", {
			encoding: "utf-8",
			stdio: "pipe",
		})
		return stats.trim()
	} catch {
		return ""
	}
}

/**
 * Get list of modified files
 */
function getModifiedFiles(): string[] {
	try {
		const output = execSync("git diff --name-only HEAD~1..HEAD", {
			encoding: "utf-8",
			stdio: "pipe",
		})
		return output.trim().split("\n").filter(Boolean)
	} catch {
		return []
	}
}

/**
 * Check if a file path should be ignored
 */
function shouldIgnoreFile(filePath: string): boolean {
	const normalizedPath = filePath.replaceAll("\\", "/")

	for (const pattern of IGNORED_FILE_PATTERNS) {
		const normalizedPattern = pattern.replaceAll("\\", "/")

		if (normalizedPath === normalizedPattern) return true
		if (normalizedPath.startsWith(`${normalizedPattern}/`)) return true

		const fileName = normalizedPath.split("/").pop()
		if (fileName === normalizedPattern) return true
	}

	return false
}

/**
 * Check if all modified files should be ignored
 */
function shouldSkipAnalysis(modifiedFiles: string[]): boolean {
	if (modifiedFiles.length === 0) return true
	return modifiedFiles.every(shouldIgnoreFile)
}

/**
 * Format git context as a readable string
 */
function formatGitContext(commitMessage: string, modifiedFiles: string[], diffStats: string): string {
	const parts: string[] = []

	if (commitMessage) {
		parts.push(`Commit message: ${commitMessage}`)
	}

	if (modifiedFiles.length > 0) {
		parts.push(`Files changed: ${modifiedFiles.join(", ")}`)
	}

	if (diffStats) {
		parts.push(`Diff stats:\n${diffStats}`)
	}

	return parts.join("\n\n")
}

/**
 * Escape prompt for safe shell execution
 */
function escapeShellPrompt(prompt: string): string {
	return prompt.replaceAll('"', String.raw`\"`)
}

/**
 * Run command - update agent files with extracted patterns and learnings
 * New approach: Collect summaries from all tools, then use single yolo command
 */
export async function runCommand(debug = false): Promise<void> {
	setDebugMode(debug)

	if (debug) {
		logger.info("Debug mode enabled - logs will be saved to .agent-watch/debug/")
	}

	const cwd = process.cwd()
	const gitRoot = findGitRoot(cwd)

	if (!gitRoot) {
		logger.error("Not inside a git repository")
		process.exit(1)
	}

	const config = loadConfig(gitRoot)
	if (!config) {
		logger.error("No agent-watch configuration found. Run 'agent-watch init' first.")
		process.exit(1)
	}

	if (config.agentFiles.length === 0) {
		logger.warn("No agent files configured")
		return
	}

	// 1. Collect git context
	let gitContext = ""
	if (config.watchFileChanges) {
		const modifiedFiles = getModifiedFiles()

		if (shouldSkipAnalysis(modifiedFiles)) {
			logger.info("Skipping analysis - only config/documentation files changed")
			return
		}

		gitContext = formatGitContext(getCommitMessage(), modifiedFiles, getGitDiffStats())
	}

	// 2. Process sessions and get summaries from all enabled tools
	const summaries =
		config.includeChatSession && config.agents.length > 0 ? processAllSessions(gitRoot, config.agents) : []

	// Skip if no context
	if (!gitContext && summaries.length === 0) {
		logger.info("No new context to analyze")
		return
	}

	// 3. Build single yolo prompt with all context
	const agentFilePaths = config.agentFiles.map((f) => join(gitRoot, f))

	const prompt = `Based on the following context, intelligently update the agent configuration files listed below. Only update if there are meaningful new patterns, conventions, or rules to document.

${gitContext ? `## Git Changes\n${gitContext}\n\n` : ""}${summaries.length > 0 ? `## Pattern Summaries from Chat Sessions\n${summaries.join("\n\n")}\n\n` : ""}## Agent Files to Update
${agentFilePaths.map((p) => `- ${p}`).join("\n")}

Read each file, analyze its current content, and update with new insights. Merge patterns intelligently, maintain existing structure, remove outdated info. Focus on patterns and conventions, not changelogs.`

	// Log context and prompt if debug mode enabled
	logContext(gitRoot, `${gitContext}\n\nSummaries:\n${summaries.join("\n\n")}`)
	logCopilotPrompt(gitRoot, "yolo-update", prompt)

	// 4. Execute single yolo command to update all files atomically
	logger.step("Updating agent files via Copilot --yolo...")

	try {
		const output = execSync(`copilot -p "${escapeShellPrompt(prompt)}" --yolo`, {
			cwd: gitRoot,
			encoding: "utf-8",
			stdio: "pipe",
			timeout: 180_000, // 3 minutes
		})

		logCopilotResponse(gitRoot, "yolo-update", output)
		logger.success("Agent files updated successfully")
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		logger.error(`Failed to update files: ${errorMessage}`)
		process.exit(1)
	}
}
