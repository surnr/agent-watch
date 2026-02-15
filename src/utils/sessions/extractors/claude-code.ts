import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import type { Session, SessionContent, SessionExtractor } from "../types.js"
import { projectPathToClaudeHash, truncate } from "../utils.js"

/**
 * Extractor for Claude Code sessions
 * Sessions are stored in ~/.claude/projects/<project-hash>/
 */
export class ClaudeCodeExtractor implements SessionExtractor {
	readonly toolId = "claude-code"

	private getClaudeProjectDir(projectRoot: string): string | null {
		const hash = projectPathToClaudeHash(projectRoot)
		const projectDir = join(homedir(), ".claude", "projects", hash)
		return existsSync(projectDir) ? projectDir : null
	}

	getSessions(projectRoot: string, limit = 3): Session[] {
		const projectDir = this.getClaudeProjectDir(projectRoot)
		if (!projectDir) return []

		const indexFile = join(projectDir, "sessions-index.json")
		if (!existsSync(indexFile)) return []

		try {
			const indexData = JSON.parse(readFileSync(indexFile, "utf-8"))

			// sessions-index.json has { version, entries: [...], originalPath }
			const entries = indexData.entries ?? []

			interface IndexEntry {
				sessionId: string
				projectPath: string
				gitBranch: string
				created: string
				modified: string
				messageCount: number
			}

			const sessions: Session[] = entries
				.filter((entry: IndexEntry) => entry.projectPath === projectRoot)
				.map((entry: IndexEntry) => ({
					id: entry.sessionId,
					toolId: this.toolId,
					projectPath: projectRoot,
					branch: entry.gitBranch,
					createdAt: entry.created,
					updatedAt: entry.modified,
					messageCount: entry.messageCount,
				}))

			// Sort by updatedAt descending (most recent first)
			sessions.sort((a, b) => {
				const dateA = new Date(a.updatedAt).getTime()
				const dateB = new Date(b.updatedAt).getTime()
				return dateB - dateA
			})

			return sessions.slice(0, limit)
		} catch (_error) {
			// Return empty if index file is corrupted
			return []
		}
	}

	extractContent(session: Session): SessionContent {
		const projectDir = this.getClaudeProjectDir(session.projectPath)
		if (!projectDir) {
			return { humanMessages: [], aiResponse: "" }
		}

		const sessionFile = join(projectDir, `${session.id}.jsonl`)
		if (!existsSync(sessionFile)) {
			return { humanMessages: [], aiResponse: "" }
		}

		try {
			const lines = readFileSync(sessionFile, "utf-8").split("\n").filter(Boolean)

			const humanMessages: string[] = []
			let lastAiResponse = ""

			interface ContentBlock {
				type: string
				text?: string
			}

			for (const line of lines) {
				try {
					const event = JSON.parse(line)

					// Extract user messages
					if (event.type === "user" && event.message?.content) {
						const textContent = event.message.content
							.filter((c: ContentBlock) => c.type === "text")
							.map((c: ContentBlock) => c.text)
							.join(" ")

						if (textContent.trim()) {
							humanMessages.push(truncate(textContent.trim(), 500))
						}
					}

					// Extract assistant messages (keep updating to get the last one)
					if (event.type === "assistant" && event.message?.content) {
						const textContent = event.message.content
							.filter((c: ContentBlock) => c.type === "text")
							.map((c: ContentBlock) => c.text)
							.join(" ")

						if (textContent.trim()) {
							lastAiResponse = truncate(textContent.trim(), 1000)
						}
					}
				} catch {
					// Skip malformed lines
				}
			}

			return {
				humanMessages,
				aiResponse: lastAiResponse,
			}
		} catch (_error) {
			return { humanMessages: [], aiResponse: "" }
		}
	}
}
