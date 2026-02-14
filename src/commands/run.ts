import { execSync } from "node:child_process"
import { appendFileSync } from "node:fs"
import { join } from "node:path"
import { loadConfig } from "../config.js"
import { findGitRoot } from "../utils/git.js"
import { logger } from "../utils/logger.js"
import { processNewSessions } from "../utils/sessions.js"

/**
 * Get git diff for recent changes
 */
function getGitDiff(): string {
	try {
		const diff = execSync("git diff HEAD~1..HEAD", {
			encoding: "utf-8",
			stdio: "pipe",
		})
		return diff.trim()
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
 * Update an agent file with new context
 */
function updateAgentFile(
	projectRoot: string,
	filePath: string,
	context: string
): void {
	try {
		const fullPath = join(projectRoot, filePath)
		const timestamp = new Date().toISOString()

		const entry = `\n\n---\n## Update ${timestamp}\n\n${context}\n`

		appendFileSync(fullPath, entry, "utf-8")
		logger.success(`Updated ${filePath}`)
	} catch (error) {
		logger.warn(`Failed to update ${filePath}`)
	}
}

/**
 * Run command - update agent files with recent changes and chat sessions
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

	// Collect file changes context
	if (config.watchFileChanges) {
		const modifiedFiles = getModifiedFiles()
		if (modifiedFiles.length > 0) {
			contextParts.push(`### Modified Files\n${modifiedFiles.map(f => `- ${f}`).join("\n")}`)

			const diff = getGitDiff()
			if (diff) {
				contextParts.push(`### Changes\n\`\`\`diff\n${diff}\n\`\`\``)
			}
		}
	}

	// Collect chat session context
	if (config.includeChatSession) {
		const sessionContext = processNewSessions(gitRoot)
		if (sessionContext) {
			contextParts.push(`### Chat Sessions\n${sessionContext}`)
		}
	}

	if (contextParts.length === 0) {
		logger.info("No new context to add")
		return
	}

	const context = contextParts.join("\n\n")

	// Update each configured agent file
	for (const filePath of config.agentFiles) {
		updateAgentFile(gitRoot, filePath, context)
	}

	logger.success(`Updated ${config.agentFiles.length} agent file(s)`)
}
