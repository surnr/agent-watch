import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

/**
 * Add entries to .gitignore if they don't already exist
 */
export function addToGitignore(projectRoot: string, entries: string[]): void {
	const gitignorePath = join(projectRoot, ".gitignore")

	// Check if project root exists
	if (!existsSync(projectRoot)) {
		return
	}

	let content = ""
	if (existsSync(gitignorePath)) {
		content = readFileSync(gitignorePath, "utf-8")
	}

	const lines = content.split("\n")
	const entriesToAdd: string[] = []

	for (const entry of entries) {
		// Check if entry already exists (exact match or pattern match)
		const exists = lines.some(line => {
			const trimmed = line.trim()
			return trimmed === entry || trimmed === `/${entry}`
		})

		if (!exists) {
			entriesToAdd.push(entry)
		}
	}

	if (entriesToAdd.length === 0) {
		return
	}

	// Add entries with a comment
	const newContent = `${content.trim()}\n\n# agent-watch\n${entriesToAdd.join("\n")}\n`

	try {
		writeFileSync(gitignorePath, newContent, "utf-8")
	} catch {
		// Silently fail if we can't write (e.g., in test environments)
	}
}
