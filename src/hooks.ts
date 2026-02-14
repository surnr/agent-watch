import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { GitHookTrigger } from "./constants.js"
import { getGitHooksDir, hasHusky, hasLefthook } from "./utils/git.js"

const HOOK_MARKER_START = "# >>> agent-watch hook start >>>"
const HOOK_MARKER_END = "# <<< agent-watch hook end <<<"

function getHookScript(): string {
	return `${HOOK_MARKER_START}
# agent-watch: auto-update agent configuration files
npx agent-watch run 2>/dev/null || true
${HOOK_MARKER_END}`
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

	if (hasLefthook(projectRoot)) {
		return {
			success: true,
			message: `Lefthook detected. Add the following to your lefthook.yml under '${hookName}':\n\n  agent-watch:\n    run: npx agent-watch run`,
			method: "lefthook",
		}
	}

	if (hasHusky(projectRoot)) {
		return {
			success: true,
			message: `Husky detected. Run: npx husky add .husky/${hookName} "npx agent-watch run"`,
			method: "husky",
		}
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
