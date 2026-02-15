import { execSync } from "node:child_process"
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { GitHookTrigger } from "./constants.js"
import {
	getGitHooksDir,
	getLefthookPath,
	hasHusky,
	hasLefthook,
	isHuskyAvailable,
	isLefthookAvailable,
} from "./utils/git.js"

const HOOK_MARKER_START = "# >>> agent-watch hook start >>>"
const HOOK_MARKER_END = "# <<< agent-watch hook end <<<"

function getHookScript(): string {
	return `${HOOK_MARKER_START}
# agent-watch: auto-update agent configuration files
npx agent-watch run 2>/dev/null || true
${HOOK_MARKER_END}`
}

/**
 * Validate basic lefthook.yml structure before attempting modification.
 * Checks: not empty, contains colons, no tabs, reasonable line/indentation length.
 */
function isValidLefthookStructure(content: string): boolean {
	// Basic sanity checks
	if (!content.trim()) return false

	// Should contain at least one colon (YAML key-value)
	if (!content.includes(":")) return false

	// Should not contain tabs (YAML uses spaces)
	if (content.includes("\t")) return false

	// Should have reasonable line count
	const lines = content.split("\n")
	if (lines.length > 1000) return false

	// Check for catastrophic indentation issues
	for (const line of lines) {
		if (line.length > 500) return false
		const leadingSpaces = line.search(/\S/)
		if (leadingSpaces > 50 && leadingSpaces !== -1) return false
	}

	return true
}

/**
 * Remove existing agent-watch hook section from lefthook.yml content.
 * Removes ANY agent-watch: section to prevent duplicates.
 */
function removeExistingAgentWatchHook(lines: string[]): string[] {
	const result: string[] = []
	let inAgentWatchSection = false
	let sectionIndentation = 0

	for (const line of lines) {
		const trimmed = line.trim()

		// Detect start of ANY agent-watch section (with or without marker)
		if (trimmed.startsWith("agent-watch:")) {
			inAgentWatchSection = true
			sectionIndentation = line.search(/\S/)
			continue
		}

		// Skip lines in agent-watch section
		if (inAgentWatchSection) {
			const currentIndent = line.search(/\S/)
			if (currentIndent !== -1 && currentIndent <= sectionIndentation && trimmed.length > 0) {
				inAgentWatchSection = false
				result.push(line)
			}
			continue
		}

		result.push(line)
	}

	return result
}

/**
 * Insert agent-watch command into lefthook.yml content.
 * Handles: missing hook section, missing commands section, proper indentation.
 */
function insertAgentWatchCommand(
	lines: string[],
	hookName: string
): { success: boolean; content?: string; error?: string } {
	const result: string[] = []
	let inserted = false

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i]
		result.push(line)

		// Look for hook section
		if (line.trim() === `${hookName}:`) {
			// Look ahead for "commands:" section
			let commandsLineIndex = -1
			for (let j = i + 1; j < lines.length; j++) {
				const trimmedLine = lines[j].trim()
				if (trimmedLine.startsWith("commands:")) {
					commandsLineIndex = j
					break
				}
				if (trimmedLine && !lines[j].startsWith(" ")) {
					// Reached next section
					break
				}
			}

			if (commandsLineIndex === -1) {
				// Need to add commands section
				result.push("  commands:", "    agent-watch:", "      run: npx agent-watch run")
				inserted = true
				continue
			}
			// Commands section exists, will insert after it
			// Continue to that line
			for (let j = i + 1; j <= commandsLineIndex; j++) {
				result.push(lines[j])
			}
			result.push("    agent-watch:", "      run: npx agent-watch run")
			inserted = true
			i = commandsLineIndex
		}
	}

	if (!inserted) {
		return {
			success: false,
			error: `Could not find proper insertion point in lefthook.yml for ${hookName}`,
		}
	}

	return { success: true, content: result.join("\n") }
}

/**
 * Update lefthook.yml content by adding/replacing agent-watch hook.
 * Coordinates removal and insertion, handles edge cases.
 */
function updateLefthookContent(
	content: string,
	hookName: string
): { success: boolean; content?: string; error?: string } {
	const lines = content.split("\n")

	// Check if hook section exists
	const hookSectionRegex = new RegExp(`^${hookName}:\\s*$`, "m")
	const hasHookSection = hookSectionRegex.test(content)

	// Remove existing agent-watch hook if present
	const withoutOldHook = removeExistingAgentWatchHook(lines)

	if (!hasHookSection) {
		// Add entire hook section
		const newSection = `
${hookName}:
  commands:
    agent-watch:
      run: npx agent-watch run
`
		return {
			success: true,
			content: withoutOldHook.join("\n") + newSection,
		}
	}

	// Hook section exists, find insertion point
	const result = insertAgentWatchCommand(withoutOldHook, hookName)
	return result
}

/**
 * Map the trigger name to the git hook file name.
 */
function getGitHookName(trigger: GitHookTrigger): string {
	switch (trigger) {
		case "commit":
			return "post-commit"
		case "push":
			return "pre-push"
	}
}

/**
 * Install agent-watch hook into lefthook.yml.
 * Flow: read file → validate → update content → write → run lefthook install
 */
function installLefthookHook(projectRoot: string, hookName: string): HookInstallResult {
	// 1. Find lefthook.yml or lefthook.yaml
	const lefthookPath = getLefthookPath(projectRoot)
	if (!lefthookPath) {
		return {
			success: false,
			message: "lefthook.yml not found",
			method: "manual",
		}
	}

	// 2. Read current content
	let currentContent: string
	try {
		currentContent = readFileSync(lefthookPath, "utf-8")
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error)
		return {
			success: false,
			message: `Cannot read lefthook.yml: ${msg}. Please add manually:\n\n${hookName}:\n  commands:\n    agent-watch:\n      run: npx agent-watch run`,
			method: "manual",
		}
	}

	// 3. Validate structure (basic sanity check)
	// Empty files are valid - we'll create the structure
	const isEmpty = currentContent.trim().length === 0
	if (!isEmpty && !isValidLefthookStructure(currentContent)) {
		return {
			success: true,
			message: `lefthook.yml has complex structure. Please add manually:\n\n${hookName}:\n  commands:\n    agent-watch:\n      run: npx agent-watch run`,
			method: "lefthook",
		}
	}

	// 4. Update content (handles both new and existing hooks)
	const result = updateLefthookContent(currentContent, hookName)
	if (!result.success || !result.content) {
		return {
			success: false,
			message: result.error || "Failed to update lefthook.yml",
			method: "manual",
		}
	}

	// 5. Write updated content (atomic write)
	try {
		const tempPath = `${lefthookPath}.tmp`
		writeFileSync(tempPath, result.content, "utf-8")
		renameSync(tempPath, lefthookPath)
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error)
		return {
			success: false,
			message: `Failed to write lefthook.yml: ${msg}`,
			method: "manual",
		}
	}

	// 6. Run lefthook install (if available)
	if (isLefthookAvailable()) {
		try {
			execSync("npx lefthook install", {
				cwd: projectRoot,
				stdio: "inherit",
				timeout: 30000,
			})
			return {
				success: true,
				message: `Lefthook hook installed successfully in ${hookName}`,
				method: "lefthook",
			}
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error)
			return {
				success: true,
				message: `Hook added to lefthook.yml. Failed to run lefthook install: ${msg}\nPlease run: npx lefthook install`,
				method: "lefthook",
			}
		}
	}

	return {
		success: true,
		message: "Hook added to lefthook.yml. Please run: npx lefthook install",
		method: "lefthook",
	}
}

/**
 * Install agent-watch hook using husky CLI.
 * Runs: npx husky add .husky/{hookName} "npx agent-watch run"
 */
function installHuskyHook(projectRoot: string, hookName: string): HookInstallResult {
	const huskyDir = join(projectRoot, ".husky")

	// Verify husky directory exists
	if (!existsSync(huskyDir)) {
		return {
			success: false,
			message: ".husky directory not found. Initialize husky first with: npx husky init",
			method: "manual",
		}
	}

	// Check if hook already exists and contains agent-watch
	const hookPath = join(huskyDir, hookName)
	if (existsSync(hookPath)) {
		try {
			const content = readFileSync(hookPath, "utf-8")
			if (content.includes("agent-watch run")) {
				return {
					success: true,
					message: `Husky hook already configured in .husky/${hookName}`,
					method: "husky",
				}
			}
		} catch {
			// Ignore read errors, will try to add anyway
		}
	}

	// Try to add hook using husky CLI
	if (isHuskyAvailable()) {
		try {
			const command = `npx husky add .husky/${hookName} "npx agent-watch run"`
			execSync(command, {
				cwd: projectRoot,
				stdio: "pipe",
				timeout: 30000,
			})

			return {
				success: true,
				message: `Husky hook installed successfully in .husky/${hookName}`,
				method: "husky",
			}
		} catch {
			// Fall back to manual instructions
		}
	}

	// Fall back to manual instructions
	return {
		success: true,
		message: `Husky detected. Run: npx husky add .husky/${hookName} "npx agent-watch run"`,
		method: "husky",
	}
}

export interface HookInstallResult {
	success: boolean
	message: string
	method: "direct" | "lefthook" | "husky" | "manual"
}

/**
 * Install the agent-watch hook into the git hooks directory.
 * If a hook file already exists, appends our section.
 * If lefthook or husky is detected, provides instructions instead.
 */
export function installGitHook(projectRoot: string, gitRoot: string, trigger: GitHookTrigger): HookInstallResult {
	const hookName = getGitHookName(trigger)

	// Try automatic installation for lefthook
	if (hasLefthook(projectRoot)) {
		return installLefthookHook(projectRoot, hookName)
	}

	// Try automatic installation for husky
	if (hasHusky(projectRoot)) {
		return installHuskyHook(projectRoot, hookName)
	}

	const hooksDir = getGitHooksDir(gitRoot)
	const hookPath = join(hooksDir, hookName)

	try {
		if (!existsSync(hooksDir)) {
			mkdirSync(hooksDir, { recursive: true })
		}

		let hookContent: string
		if (existsSync(hookPath)) {
			const existing = readFileSync(hookPath, "utf-8")
			if (existing.includes(HOOK_MARKER_START)) {
				const regex = new RegExp(`${escapeRegex(HOOK_MARKER_START)}[\\s\\S]*?${escapeRegex(HOOK_MARKER_END)}`)
				hookContent = existing.replace(regex, getHookScript())
			} else {
				hookContent = `${existing.trimEnd()}\n\n${getHookScript()}\n`
			}
		} else {
			hookContent = `#!/bin/sh\n\n${getHookScript()}\n`
		}

		writeFileSync(hookPath, hookContent, "utf-8")
		chmodSync(hookPath, 0o755)

		return {
			success: true,
			message: `Git ${hookName} hook installed successfully.`,
			method: "direct",
		}
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error)
		return {
			success: false,
			message: `Failed to install git hook: ${msg}`,
			method: "manual",
		}
	}
}

function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
