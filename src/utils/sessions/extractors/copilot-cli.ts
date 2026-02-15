import { execSync } from "node:child_process"
import { existsSync, readFileSync, readdirSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import type { Session, SessionContent, SessionExtractor } from "../types.js"
import { truncate } from "../utils.js"

const COPILOT_SESSION_STATE_DIR = join(homedir(), ".copilot", "session-state")

/**
 * Parse a workspace.yaml file (simple key: value parser)
 */
function parseWorkspaceYaml(content: string): Record<string, string> {
	const result: Record<string, string> = {}

	for (const line of content.split("\n")) {
		const colonIndex = line.indexOf(":")
		if (colonIndex === -1) continue

		const key = line.slice(0, colonIndex).trim()
		const value = line.slice(colonIndex + 1).trim()
		result[key] = value
	}

	return result
}

/**
 * Extractor for GitHub Copilot CLI sessions
 * Sessions are stored in ~/.copilot/session-state/<id>/workspace.yaml
 */
export class CopilotCliExtractor implements SessionExtractor {
	readonly toolId = "github-copilot-cli"

	getSessions(projectRoot: string, limit = 3): Session[] {
		if (!existsSync(COPILOT_SESSION_STATE_DIR)) return []

		try {
			const sessionDirs = readdirSync(COPILOT_SESSION_STATE_DIR, { withFileTypes: true })
				.filter((d) => d.isDirectory())
				.map((d) => d.name)

			const sessions: Session[] = []

			for (const dirName of sessionDirs) {
				const workspaceFile = join(COPILOT_SESSION_STATE_DIR, dirName, "workspace.yaml")
				if (!existsSync(workspaceFile)) continue

				try {
					const content = readFileSync(workspaceFile, "utf-8")
					const parsed = parseWorkspaceYaml(content)

					const gitRoot = parsed.git_root
					const cwd = parsed.cwd

					// Filter to sessions belonging to this project
					if (gitRoot !== projectRoot && cwd !== projectRoot) continue

					sessions.push({
						id: parsed.id || dirName,
						toolId: this.toolId,
						projectPath: gitRoot || cwd || projectRoot,
						branch: parsed.branch,
						createdAt: parsed.created_at || "",
						updatedAt: parsed.updated_at || "",
					})
				} catch {
					// Skip malformed session files
				}
			}

			// Sort by updatedAt descending
			sessions.sort((a, b) => {
				const dateA = new Date(a.updatedAt).getTime() || 0
				const dateB = new Date(b.updatedAt).getTime() || 0
				return dateB - dateA
			})

			return sessions.slice(0, limit)
		} catch {
			return []
		}
	}

	extractContent(session: Session): SessionContent {
		try {
			// Use copilot --resume to get session content
			const output = execSync(
				`copilot --resume ${session.id} -p "List every user request and your response from this session. Format each pair on its own line exactly as: USER: <their message> | AGENT: <your response summary>" -s --allow-all`,
				{
					encoding: "utf-8",
					stdio: "pipe",
					timeout: 120_000, // 2 minutes
				}
			)

			// Parse the output
			const lines = output.split("\n")
			const humanMessages: string[] = []
			let lastAiResponse = ""

			for (const line of lines) {
				const match = /USER:\s*(.+?)\s*\|\s*AGENT:\s*(.+)/.exec(line)
				if (match) {
					humanMessages.push(truncate(match[1].trim(), 500))
					lastAiResponse = truncate(match[2].trim(), 1000)
				}
			}

			return {
				humanMessages,
				aiResponse: lastAiResponse,
			}
		} catch {
			return { humanMessages: [], aiResponse: "" }
		}
	}
}
