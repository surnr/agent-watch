import { execSync } from "node:child_process"
import { buildSessionAnalysisPrompt } from "../../prompts/index.js"
import { logger } from "../logger.js"
import type { SessionContent } from "./types.js"
import { escapePrompt } from "./utils.js"

/**
 * Summarize a session's content using Copilot CLI
 * Extracts patterns, conventions, and rules from the conversation
 * @returns Summary string or null if no significant patterns found
 */
export function summarizeSession(content: SessionContent, toolId: string): string | null {
	// Skip if no content
	if (content.humanMessages.length === 0 || !content.aiResponse) {
		return null
	}

	const prompt = buildSessionAnalysisPrompt(content.humanMessages, content.aiResponse)

	try {
		const output = execSync(`copilot -p "${escapePrompt(prompt)}" -s`, {
			encoding: "utf-8",
			stdio: "pipe",
			timeout: 60_000, // 1 minute
		})

		const summary = output.trim()

		// Check if Copilot found no patterns
		if (summary === "No patterns." || summary.length === 0) {
			return null
		}

		// Prefix with tool name for context
		return `[From ${toolId}]\n${summary}`
	} catch (error) {
		logger.warn(`Failed to summarize session from ${toolId}: ${error instanceof Error ? error.message : String(error)}`)
		return null
	}
}
