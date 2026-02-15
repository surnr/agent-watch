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

/**
 * Get the path to lefthook.yml or lefthook.yaml.
 * Returns null if not found.
 */
export function getLefthookPath(projectRoot: string): string | null {
	const ymlPath = join(projectRoot, "lefthook.yml")
	const yamlPath = join(projectRoot, "lefthook.yaml")

	if (existsSync(ymlPath)) {
		return ymlPath
	}
	if (existsSync(yamlPath)) {
		return yamlPath
	}
	return null
}

/**
 * Check if lefthook CLI is available.
 */
export function isLefthookAvailable(): boolean {
	try {
		execSync("npx lefthook version", {
			stdio: "pipe",
			timeout: 5000,
		})
		return true
	} catch {
		return false
	}
}

/**
 * Check if husky CLI is available.
 */
export function isHuskyAvailable(): boolean {
	try {
		execSync("npx husky --version", {
			stdio: "pipe",
			timeout: 5000,
		})
		return true
	} catch {
		return false
	}
}
