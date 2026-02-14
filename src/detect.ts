import { existsSync } from "node:fs"
import { join } from "node:path"
import { type AgentFilePattern, KNOWN_AGENT_FILES } from "./constants.js"

export interface AgentFileInfo {
	pattern: AgentFilePattern
	exists: boolean
	absolutePath: string
}

/**
 * Scan the project root for known agent configuration files.
 * Returns information about each known file pattern including whether it exists.
 */
export function detectAgentFiles(projectRoot: string): AgentFileInfo[] {
	return KNOWN_AGENT_FILES.map((pattern) => {
		const absolutePath = join(projectRoot, pattern.path)
		return {
			pattern,
			exists: existsSync(absolutePath),
			absolutePath,
		}
	})
}

/**
 * Get only the agent files that exist in the project.
 */
export function getExistingAgentFiles(projectRoot: string): AgentFileInfo[] {
	return detectAgentFiles(projectRoot).filter((f) => f.exists)
}
