import { execSync } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"

/**
 * Find the git repository root from a given directory.
 * Returns null if not in a git repository.
 */
export function findGitRoot(cwd: string = process.cwd()): string | null {
	try {
		const result = execSync("git rev-parse --show-toplevel", {
			cwd,
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		})
		return result.trim()
	} catch {
		return null
	}
}

/**
 * Check if the given directory is inside a git repository.
 */
export function isGitRepo(cwd: string = process.cwd()): boolean {
	return findGitRoot(cwd) !== null
}

/**
 * Get the path to the .git/hooks directory.
 */
export function getGitHooksDir(gitRoot: string): string {
	return join(gitRoot, ".git", "hooks")
}

/**
 * Check if lefthook is installed in the project.
 */
export function hasLefthook(projectRoot: string): boolean {
	return existsSync(join(projectRoot, "lefthook.yml")) || existsSync(join(projectRoot, "lefthook.yaml"))
}

/**
 * Check if husky is installed in the project.
 */
export function hasHusky(projectRoot: string): boolean {
	return existsSync(join(projectRoot, ".husky"))
}
