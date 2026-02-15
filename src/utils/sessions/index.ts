import { logger } from "../logger.js"
import { ClaudeCodeExtractor } from "./extractors/claude-code.js"
import { CopilotChatExtractor } from "./extractors/copilot-chat.js"
import { CopilotCliExtractor } from "./extractors/copilot-cli.js"
import { getProcessedSessionIds, markSessionsAsProcessed } from "./state.js"
import { summarizeSession } from "./summarize.js"
import type { SessionExtractor } from "./types.js"

/**
 * Registry of all available session extractors
 */
const EXTRACTORS: Record<string, SessionExtractor> = {
	"claude-code": new ClaudeCodeExtractor(),
	"github-copilot-chat": new CopilotChatExtractor(),
	"github-copilot-cli": new CopilotCliExtractor(),
}

/**
 * Process sessions from all enabled AI tools
 * Extracts latest 3 sessions from each tool, generates summaries, and tracks processed sessions
 *
 * @param projectRoot Absolute path to project root
 * @param enabledTools Array of tool IDs to process
 * @returns Array of session summaries, or empty array if no new sessions
 */
export function processAllSessions(projectRoot: string, enabledTools: string[]): string[] {
	const summaries: string[] = []
	let totalProcessed = 0

	for (const toolId of enabledTools) {
		const extractor = EXTRACTORS[toolId]
		if (!extractor) {
			logger.warn(`Unknown tool: ${toolId}`)
			continue
		}

		try {
			// 1. Get latest 3 sessions for this tool
			const sessions = extractor.getSessions(projectRoot, 3)

			// 2. Filter out already-processed sessions
			const processedIds = getProcessedSessionIds(projectRoot, toolId)
			const unprocessed = sessions.filter((s) => !processedIds.includes(s.id))

			if (unprocessed.length === 0) {
				continue
			}

			// 3. Extract content and summarize each session
			for (const session of unprocessed) {
				try {
					const content = extractor.extractContent(session)

					// Skip empty sessions
					if (content.humanMessages.length === 0 || !content.aiResponse) {
						continue
					}

					const summary = summarizeSession(content, toolId)
					if (summary) {
						summaries.push(summary)
					}
				} catch (error) {
					logger.warn(
						`Failed to process session ${session.id} from ${toolId}: ${error instanceof Error ? error.message : String(error)}`
					)
				}
			}

			// 4. Mark all unprocessed sessions as processed (even if summarization failed)
			markSessionsAsProcessed(
				projectRoot,
				toolId,
				unprocessed.map((s) => s.id)
			)

			totalProcessed += unprocessed.length
		} catch (error) {
			logger.warn(
				`Failed to extract sessions from ${toolId}: ${error instanceof Error ? error.message : String(error)}`
			)
		}
	}

	if (totalProcessed > 0) {
		logger.success(`Processed ${totalProcessed} chat session(s) from ${enabledTools.length} tool(s)`)
	}

	return summaries
}

// Export types and utilities for testing
export type { Session, SessionContent, SessionExtractor } from "./types.js"
export { getProcessedSessionIds, markSessionsAsProcessed, clearProcessedSessions } from "./state.js"
