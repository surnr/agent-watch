import { execSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { AGENT_WATCH_DIR, SESSIONS_STATE_FILE } from "../constants.js"
import { logSessionExport } from "./debug.js"
import { logger } from "./logger.js"

export interface CopilotSession {
	id: string
	cwd: string
	gitRoot: string
	branch: string
	createdAt: string
	updatedAt: string
}

export interface SessionConversation {
	userQuery: string
	agentResponse: string
}

const COPILOT_SESSION_STATE_DIR = join(homedir(), ".copilot", "session-state")

/**
 * Parse a workspace.yaml file into a CopilotSession object.
 * Uses simple line-by-line parsing to avoid a YAML dependency.
 */
function parseWorkspaceYaml(content: string): Partial<CopilotSession> {
	const result: Record<string, string> = {}
	for (const line of content.split("\n")) {
		const colonIndex = line.indexOf(":")
		if (colonIndex === -1) continue
		const key = line.slice(0, colonIndex).trim()
		const value = line.slice(colonIndex + 1).trim()
		result[key] = value
	}
	return {
		id: result.id,
		cwd: result.cwd,
		gitRoot: result.git_root,
		branch: result.branch,
		createdAt: result.created_at,
		updatedAt: result.updated_at,
	}
}

/**
 * Discover Copilot CLI sessions for the given project.
 * Reads workspace.yaml from each session in ~/.copilot/session-state/, filters to sessions
 * matching the project's git root, and returns the latest N sessions.
 */
export function getCopilotSessions(projectRoot: string, limit = 5): CopilotSession[] {
	if (!existsSync(COPILOT_SESSION_STATE_DIR)) {
		return []
	}

	const sessionDirs = readdirSync(COPILOT_SESSION_STATE_DIR, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name)

	const sessions: CopilotSession[] = []

	for (const dirName of sessionDirs) {
		const workspaceFile = join(COPILOT_SESSION_STATE_DIR, dirName, "workspace.yaml")
		if (!existsSync(workspaceFile)) continue

		try {
			const content = readFileSync(workspaceFile, "utf-8")
			const parsed = parseWorkspaceYaml(content)

			if (!parsed.id || !parsed.gitRoot) continue

			// Filter to sessions belonging to this project
			if (parsed.gitRoot !== projectRoot && parsed.cwd !== projectRoot) continue

			sessions.push({
				id: parsed.id,
				cwd: parsed.cwd ?? projectRoot,
				gitRoot: parsed.gitRoot,
				branch: parsed.branch ?? "unknown",
				createdAt: parsed.createdAt ?? "",
				updatedAt: parsed.updatedAt ?? "",
			})
		} catch {
			// Skip malformed session files
		}
	}

	// Sort by updatedAt descending (most recent first)
	sessions.sort((a, b) => {
		const dateA = new Date(a.updatedAt).getTime() || 0
		const dateB = new Date(b.updatedAt).getTime() || 0
		return dateB - dateA
	})

	return sessions.slice(0, limit)
}

/**
 * Read the list of already-processed session IDs from the project state file.
 */
export function getProcessedSessionIds(projectRoot: string): string[] {
	const stateFile = join(projectRoot, AGENT_WATCH_DIR, SESSIONS_STATE_FILE)
	if (!existsSync(stateFile)) return []

	try {
		const content = readFileSync(stateFile, "utf-8")
		const state = JSON.parse(content)
		return Array.isArray(state.processedSessions) ? state.processedSessions : []
	} catch {
		return []
	}
}

/**
 * Save the list of processed session IDs to the project state file.
 */
export function saveProcessedSessionIds(projectRoot: string, sessionIds: string[]): void {
	const agentWatchDir = join(projectRoot, AGENT_WATCH_DIR)
	const stateFile = join(agentWatchDir, SESSIONS_STATE_FILE)

	// Ensure directory exists
	if (!existsSync(agentWatchDir)) {
		mkdirSync(agentWatchDir, { recursive: true })
	}

	const content = JSON.stringify({ processedSessions: sessionIds }, null, 2)
	writeFileSync(stateFile, `${content}\n`)
}

/**
 * Get sessions that haven't been processed yet.
 * Returns the latest N sessions for this project, minus already-processed ones.
 */
export function getUnprocessedSessions(projectRoot: string, limit = 5): CopilotSession[] {
	const sessions = getCopilotSessions(projectRoot, limit)
	const processedIds = getProcessedSessionIds(projectRoot)
	return sessions.filter((s) => !processedIds.includes(s.id))
}

/**
 * Export session conversation content by resuming the session with Copilot CLI.
 * Asks Copilot to list all user queries and agent responses from the session.
 */
export function exportSessionContent(sessionId: string, projectRoot?: string): SessionConversation[] {
	try {
		const output = execSync(
			`copilot --resume ${sessionId} -p "List every user request and your response from this session. Format each pair on its own line exactly as: USER: <their message> | AGENT: <your response summary>" -s --allow-all`,
			{
				encoding: "utf-8",
				stdio: "pipe",
				timeout: 120_000,
			}
		)

		// Log the raw session export if debug mode is enabled and projectRoot is provided
		if (projectRoot) {
			logSessionExport(projectRoot, sessionId, output)
		}

		return parseSessionOutput(output)
	} catch (error) {
		logger.warn(`Failed to export session ${sessionId}: ${error instanceof Error ? error.message : String(error)}`)
		return []
	}
}

/**
 * Parse the copilot output into structured conversation pairs.
 * Expected format per line: USER: <query> | AGENT: <response>
 */
export function parseSessionOutput(output: string): SessionConversation[] {
	const conversations: SessionConversation[] = []
	const lines = output.split("\n")

	for (const line of lines) {
		const match = /USER:\s*(.+?)\s*\|\s*AGENT:\s*(.+)/.exec(line)
		if (match) {
			conversations.push({
				userQuery: match[1].trim(),
				agentResponse: match[2].trim(),
			})
		}
	}

	return conversations
}

/**
 * Process unprocessed Copilot CLI sessions for a project.
 * Discovers new sessions, extracts conversation context, and marks them as processed.
 * Returns the combined conversation context string for use in agent file updates.
 */
export function processNewSessions(projectRoot: string): string | null {
	const unprocessed = getUnprocessedSessions(projectRoot)

	if (unprocessed.length === 0) {
		return null
	}

	const allConversations: SessionConversation[] = []

	for (const session of unprocessed) {
		const conversations = exportSessionContent(session.id, projectRoot)
		allConversations.push(...conversations)
	}

	if (allConversations.length === 0) {
		// Still mark as processed to avoid re-checking empty sessions
		const processedIds = getProcessedSessionIds(projectRoot)
		saveProcessedSessionIds(projectRoot, [...processedIds, ...unprocessed.map((s) => s.id)])
		return null
	}

	// Format conversations as context
	const context = allConversations.map((c) => `User: ${c.userQuery}\nAgent: ${c.agentResponse}`).join("\n\n")

	// Mark sessions as processed
	const processedIds = getProcessedSessionIds(projectRoot)
	saveProcessedSessionIds(projectRoot, [...processedIds, ...unprocessed.map((s) => s.id)])

	logger.success(`Processed ${unprocessed.length} chat session(s)`)

	return context
}
