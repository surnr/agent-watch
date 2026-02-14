import { execSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { loadConfig } from "../config.js"
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
 * Use Copilot CLI to analyze context and extract patterns/rules
 */
function analyzeContextWithCopilot(
	projectRoot: string,
	context: string,
	agentFilePath: string
): string | null {
	try {
		const prompt = `You are analyzing a recent code change and chat sessions to update ${agentFilePath}.

This file contains patterns, conventions, and code rules for the project. Your job is to:
1. Analyze the recent changes and conversations
2. Extract any new patterns, conventions, or rules that emerge
3. Identify mistakes to avoid or best practices being followed
4. Output ONLY new insights to add to the file (not raw code or diffs)

If there are no meaningful patterns or rules to extract, output "NO_UPDATE".

Recent context:
${context}

Extract patterns, conventions, and rules (be concise and specific):`

		const escapedPrompt = prompt.replaceAll('"', String.raw`\"`)
		const command = `copilot -p "${escapedPrompt}" -s`

		const result = execSync(command, {
			cwd: projectRoot,
			encoding: "utf-8",
			stdio: "pipe",
			timeout: 60_000,
		})

		const output = result.trim()
		return output === "NO_UPDATE" || output.length === 0 ? null : output
	} catch {
		return null
	}
}

/**
 * Update an agent file intelligently with extracted insights
 */
function updateAgentFile(
	projectRoot: string,
	filePath: string,
	insights: string
): void {
	try {
		const fullPath = join(projectRoot, filePath)
		const currentContent = readFileSync(fullPath, "utf-8")
		const timestamp = new Date().toISOString().split("T")[0] // Just date

		// Add insights to a "Recent Learnings" or "Patterns" section
		const update = `\n\n## Recent Updates (${timestamp})\n\n${insights}\n`

		writeFileSync(fullPath, currentContent + update, "utf-8")
		logger.success(`Updated ${filePath}`)
	} catch {
		logger.warn(`Failed to update ${filePath}`)
	}
}

/**
 * Run command - update agent files with extracted patterns and learnings
 */
export async function runCommand(): Promise<void> {
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
		const commitMessage = getCommitMessage()
		const diffStats = getGitDiffStats()

		if (modifiedFiles.length > 0) {
			const fileContext = [
				commitMessage ? `Commit: ${commitMessage}` : "",
				`Files changed: ${modifiedFiles.join(", ")}`,
				diffStats ? `Stats:\n${diffStats}` : "",
			].filter(Boolean).join("\n")

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

	logger.step("Analyzing context for patterns and rules...")

	// Update each configured agent file
	let updatedCount = 0
	for (const filePath of config.agentFiles) {
		const insights = analyzeContextWithCopilot(gitRoot, context, filePath)
		if (insights) {
			updateAgentFile(gitRoot, filePath, insights)
			updatedCount++
		}
	}

	if (updatedCount > 0) {
		logger.success(`Updated ${updatedCount} agent file(s) with new insights`)
	} else {
		logger.info("No significant patterns found to update")
	}
}
