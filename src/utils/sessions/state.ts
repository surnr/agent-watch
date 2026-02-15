import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { AGENT_WATCH_DIR, SESSIONS_STATE_FILE } from "../../constants.js"
import type { SessionStateData } from "./types.js"

/**
 * Load session state from disk
 */
function loadState(projectRoot: string): SessionStateData {
	const stateFile = join(projectRoot, AGENT_WATCH_DIR, SESSIONS_STATE_FILE)

	if (!existsSync(stateFile)) {
		return {
			processedSessions: {},
		}
	}

	try {
		const content = readFileSync(stateFile, "utf-8")
		return JSON.parse(content) as SessionStateData
	} catch {
		// Return empty state if file is corrupted
		return {
			processedSessions: {},
		}
	}
}

/**
 * Save session state to disk
 */
function saveState(projectRoot: string, state: SessionStateData): void {
	const agentWatchDir = join(projectRoot, AGENT_WATCH_DIR)
	const stateFile = join(agentWatchDir, SESSIONS_STATE_FILE)

	// Ensure directory exists
	if (!existsSync(agentWatchDir)) {
		mkdirSync(agentWatchDir, { recursive: true })
	}

	const content = JSON.stringify(state, null, 2)
	writeFileSync(stateFile, `${content}\n`)
}

/**
 * Get list of already-processed session IDs for a specific tool
 */
export function getProcessedSessionIds(projectRoot: string, toolId: string): string[] {
	const state = loadState(projectRoot)
	return state.processedSessions[toolId] ?? []
}

/**
 * Mark sessions as processed for a specific tool
 * Adds to existing list without removing old IDs
 */
export function markSessionsAsProcessed(projectRoot: string, toolId: string, sessionIds: string[]): void {
	const state = loadState(projectRoot)

	// Get existing IDs for this tool
	const existingIds = state.processedSessions[toolId] ?? []

	// Add new IDs (deduplicating)
	const updatedIds = [...new Set([...existingIds, ...sessionIds])]

	// Update state
	state.processedSessions[toolId] = updatedIds

	saveState(projectRoot, state)
}

/**
 * Clear all processed session IDs for a tool (useful for testing)
 */
export function clearProcessedSessions(projectRoot: string, toolId: string): void {
	const state = loadState(projectRoot)
	delete state.processedSessions[toolId]
	saveState(projectRoot, state)
}
