import { existsSync, readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import type { Session, SessionContent, SessionExtractor } from "../types.js"
import { getVSCodeWorkspaceStorageDir, truncate } from "../utils.js"

/**
 * Extractor for GitHub Copilot Chat sessions in VS Code
 * Sessions are stored in ~/Library/Application Support/Code/User/workspaceStorage/<hash>/chatSessions/
 */
export class CopilotChatExtractor implements SessionExtractor {
	readonly toolId = "github-copilot-chat"

	private findWorkspaceHash(projectRoot: string): string | null {
		const storageDir = getVSCodeWorkspaceStorageDir()
		if (!existsSync(storageDir)) return null

		try {
			const workspaces = readdirSync(storageDir, { withFileTypes: true })
				.filter((d) => d.isDirectory())
				.map((d) => d.name)

			for (const workspace of workspaces) {
				const workspaceFile = join(storageDir, workspace, "workspace.json")
				if (!existsSync(workspaceFile)) continue

				try {
					const data = JSON.parse(readFileSync(workspaceFile, "utf-8"))
					// workspace.json has: { folder: "file:///path/to/project" }
					const folderPath = data.folder?.replace("file://", "")

					if (folderPath === projectRoot) {
						return workspace
					}
				} catch {
					// Skip malformed workspace.json
				}
			}

			return null
		} catch {
			return null
		}
	}

	getSessions(projectRoot: string, limit = 3): Session[] {
		const workspaceHash = this.findWorkspaceHash(projectRoot)
		if (!workspaceHash) return []

		const chatDir = join(getVSCodeWorkspaceStorageDir(), workspaceHash, "chatSessions")
		if (!existsSync(chatDir)) return []

		try {
			const sessionFiles = readdirSync(chatDir)
				.filter((f) => f.endsWith(".json"))
				.map((f) => {
					const fullPath = join(chatDir, f)
					try {
						const data = JSON.parse(readFileSync(fullPath, "utf-8"))

						// Parse timestamp (could be number or ISO string)
						const lastMessageDate = data.lastMessageDate
							? new Date(data.lastMessageDate).toISOString()
							: new Date().toISOString()

						return {
							id: data.sessionId || f.replace(".json", ""),
							toolId: this.toolId,
							projectPath: projectRoot,
							createdAt: data.createdDate || lastMessageDate,
							updatedAt: lastMessageDate,
							messageCount: data.requests?.length ?? 0,
						} as Session
					} catch {
						return null
					}
				})
				.filter((s): s is Session => s !== null)

			// Sort by updatedAt descending
			sessionFiles.sort((a, b) => {
				const dateA = new Date(a.updatedAt).getTime()
				const dateB = new Date(b.updatedAt).getTime()
				return dateB - dateA
			})

			return sessionFiles.slice(0, limit)
		} catch {
			return []
		}
	}

	extractContent(session: Session): SessionContent {
		const workspaceHash = this.findWorkspaceHash(session.projectPath)
		if (!workspaceHash) {
			return { humanMessages: [], aiResponse: "" }
		}

		const sessionFile = join(getVSCodeWorkspaceStorageDir(), workspaceHash, "chatSessions", `${session.id}.json`)

		if (!existsSync(sessionFile)) {
			return { humanMessages: [], aiResponse: "" }
		}

		try {
			const data = JSON.parse(readFileSync(sessionFile, "utf-8"))
			const requests = data.requests ?? []

			const humanMessages: string[] = []
			let lastAiResponse = ""

			for (const request of requests) {
				// Extract human message
				if (request.message?.text) {
					humanMessages.push(truncate(request.message.text, 500))
				}

				// Keep updating AI response (to get the last one)
				if (request.response?.text) {
					lastAiResponse = truncate(request.response.text, 1000)
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
