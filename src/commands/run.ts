import { execSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { loadConfig } from "../config.js"
import { IGNORED_FILE_PATTERNS } from "../constants.js"
import { logContext, logCopilotPrompt, logCopilotResponse, setDebugMode } from "../utils/debug.js"
import { findGitRoot } from "../utils/git.js"
import { logger } from "../utils/logger.js"
import { processNewSessions } from "../utils/sessions.js"

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
 * Check if a file path should be ignored (doesn't trigger agent-watch analysis)
 */
function shouldIgnoreFile(filePath: string): boolean {
	const normalizedPath = filePath.replace(/\\/g, "/")

	for (const pattern of IGNORED_FILE_PATTERNS) {
		const normalizedPattern = pattern.replace(/\\/g, "/")

		// Exact match
		if (normalizedPath === normalizedPattern) {
			return true
		}

		// Directory match (e.g., ".github/workflows" matches ".github/workflows/test.yml")
		if (normalizedPath.startsWith(`${normalizedPattern}/`)) {
			return true
		}

		// Filename match anywhere in path (e.g., "README.md" matches "docs/README.md")
		const fileName = normalizedPath.split("/").pop()
		if (fileName === normalizedPattern) {
			return true
		}
	}

	return false
}

/**
 * Check if all modified files should be ignored
 */
function shouldSkipAnalysis(modifiedFiles: string[]): boolean {
	if (modifiedFiles.length === 0) {
		return true
	}

	// If ALL files are ignored, skip analysis
	return modifiedFiles.every(shouldIgnoreFile)
}

/**
 * Use Copilot CLI to intelligently update agent file content
 */
function updateAgentFileWithCopilot(
	projectRoot: string,
	context: string,
	agentFilePath: string,
	currentContent: string
): string | null {
	try {
		const prompt = `You are maintaining ${agentFilePath}, a living document of patterns, conventions, and code rules.

Your task:
1. Read the CURRENT content of this file carefully
2. Analyze the RECENT changes and conversations below
3. Determine if there are new patterns, rules, or conventions to document
4. If updates are needed, output the COMPLETE UPDATED file content
5. If no meaningful updates needed, output exactly: NO_UPDATE

Guidelines:
- Intelligently merge new insights into existing sections
- Update or refine existing rules if patterns have evolved
- Remove outdated information
- Keep it concise - no code snippets unless absolutely necessary
- Maintain the file's existing structure and tone
- Focus on patterns, conventions, and learnings - not changelogs

CURRENT FILE CONTENT:
${currentContent}

RECENT CONTEXT:
${context}

Output the complete updated file, or NO_UPDATE if nothing significant to add:`

		// Log the prompt if debug mode is enabled
		logCopilotPrompt(projectRoot, agentFilePath, prompt)

		const escapedPrompt = prompt.replaceAll('"', String.raw`\"`)
		const command = `copilot -p "${escapedPrompt}" -s`

		const result = execSync(command, {
			cwd: projectRoot,
			encoding: "utf-8",
			stdio: "pipe",
			timeout: 90_000,
		})

		const output = result.trim()

		// Log the response if debug mode is enabled
		logCopilotResponse(projectRoot, agentFilePath, output)

		if (output === "NO_UPDATE" || output.length === 0 || output === currentContent) {
			return null
		}

		return output
	} catch {
		return null
	}
}

/**
 * Run command - update agent files with extracted patterns and learnings
 */
export async function runCommand(debug = false): Promise<void> {
	// Enable debug mode if requested
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

	const contextParts: string[] = []

	// Collect file changes context (summary, not full diff)
	if (config.watchFileChanges) {
		const modifiedFiles = getModifiedFiles()

		// Skip analysis if only non-relevant files were changed
		if (shouldSkipAnalysis(modifiedFiles)) {
			logger.info("Skipping analysis - only config/documentation files changed")
			return
		}

		const commitMessage = getCommitMessage()
		const diffStats = getGitDiffStats()

		if (modifiedFiles.length > 0) {
			const fileContext = [
				commitMessage ? `Commit: ${commitMessage}` : "",
				`Files changed: ${modifiedFiles.join(", ")}`,
				diffStats ? `Stats:\n${diffStats}` : "",
			]
				.filter(Boolean)
				.join("\n")

			contextParts.push(fileContext)
		}
	}

	// Collect chat session context
	if (config.includeChatSession) {
		const sessionContext = processNewSessions(gitRoot)
		if (sessionContext) {
			contextParts.push(`Conversations:\n${sessionContext}`)
		}
	}

	if (contextParts.length === 0) {
		logger.info("No new context to analyze")
		return
	}

	const context = contextParts.join("\n\n")

	// Log the context if debug mode is enabled
	logContext(gitRoot, context)

	logger.step("Analyzing context for patterns and rules...")

	// Update each configured agent file
	let updatedCount = 0
	for (const filePath of config.agentFiles) {
		const fullPath = join(gitRoot, filePath)
		const currentContent = readFileSync(fullPath, "utf-8")

		const updatedContent = updateAgentFileWithCopilot(gitRoot, context, filePath, currentContent)
		if (updatedContent) {
			writeFileSync(fullPath, updatedContent, "utf-8")
			logger.success(`Updated ${filePath}`)
			updatedCount++
		}
	}

	if (updatedCount > 0) {
		logger.success(`Updated ${updatedCount} agent file(s) with new insights`)
	} else {
		logger.info("No significant patterns found to update")
	}
}
