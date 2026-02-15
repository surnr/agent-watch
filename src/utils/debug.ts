import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { AGENT_WATCH_DIR, DEBUG_LOGS_DIR } from "../constants.js"

/**
 * Global debug mode flag
 */
let debugMode = false

/**
 * Set the debug mode for the current run
 */
export function setDebugMode(enabled: boolean): void {
	debugMode = enabled
}

/**
 * Check if debug mode is enabled
 */
export function isDebugEnabled(): boolean {
	return debugMode
}

/**
 * Generate a timestamp for log filenames
 */
function getTimestamp(): string {
	return new Date().toISOString().replace(/[:.]/g, "-")
}

/**
 * Ensure the debug logs directory exists
 */
function ensureDebugDir(projectRoot: string): string {
	const debugDir = join(projectRoot, AGENT_WATCH_DIR, DEBUG_LOGS_DIR)
	if (!existsSync(debugDir)) {
		mkdirSync(debugDir, { recursive: true })
	}
	return debugDir
}

/**
 * Write debug content to a file in the debug logs directory
 */
export function writeDebugLog(projectRoot: string, filename: string, content: string): void {
	if (!debugMode) return

	const debugDir = ensureDebugDir(projectRoot)
	const timestamp = getTimestamp()
	const logFile = join(debugDir, `${timestamp}_${filename}`)

	writeFileSync(logFile, content, "utf-8")
}

/**
 * Log session export content
 */
export function logSessionExport(projectRoot: string, sessionId: string, content: string): void {
	writeDebugLog(projectRoot, `session_${sessionId}.txt`, content)
}

/**
 * Log the context built from file changes and chat sessions
 */
export function logContext(projectRoot: string, context: string): void {
	writeDebugLog(projectRoot, "context.txt", context)
}

/**
 * Log the prompt sent to copilot
 */
export function logCopilotPrompt(projectRoot: string, agentFile: string, prompt: string): void {
	const sanitizedFilename = agentFile.replace(/[/\\]/g, "_")
	writeDebugLog(projectRoot, `prompt_${sanitizedFilename}.txt`, prompt)
}

/**
 * Log the response from copilot
 */
export function logCopilotResponse(projectRoot: string, agentFile: string, response: string): void {
	const sanitizedFilename = agentFile.replace(/[/\\]/g, "_")
	writeDebugLog(projectRoot, `response_${sanitizedFilename}.txt`, response)
}
