import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { logger } from "./logger.js"

interface CopilotStatus {
	installed: boolean
	authenticated: boolean
	version?: string
	username?: string
}

interface CopilotConfig {
	last_logged_in_user?: { host: string; login: string }
	logged_in_users?: Array<{ host: string; login: string }>
}

const COPILOT_CONFIG_DIR = join(homedir(), ".copilot")
const COPILOT_CONFIG_FILE = join(COPILOT_CONFIG_DIR, "config.json")

/**
 * Check if the standalone GitHub Copilot CLI is installed
 */
function isCopilotInstalled(): { installed: boolean; version?: string } {
	try {
		const output = execSync("copilot -v", { encoding: "utf-8", stdio: "pipe" })
		const match = /(\d+\.\d+\.\d+)/.exec(output)
		return { installed: true, version: match?.[1] }
	} catch {
		return { installed: false }
	}
}

/**
 * Check if the user is authenticated with GitHub Copilot CLI
 * by reading the config file at ~/.copilot/config.json
 */
function getCopilotAuth(): { authenticated: boolean; username?: string } {
	try {
		if (!existsSync(COPILOT_CONFIG_FILE)) {
			return { authenticated: false }
		}

		const configContent = readFileSync(COPILOT_CONFIG_FILE, "utf-8")
		const config: CopilotConfig = JSON.parse(configContent)

		if (config.logged_in_users && config.logged_in_users.length > 0) {
			const user = config.last_logged_in_user ?? config.logged_in_users[0]
			return { authenticated: true, username: user.login }
		}

		return { authenticated: false }
	} catch {
		return { authenticated: false }
	}
}

/**
 * Check the status of GitHub Copilot CLI
 */
export function checkCopilotStatus(): CopilotStatus {
	const { installed, version } = isCopilotInstalled()
	const { authenticated, username } = getCopilotAuth()

	return { installed, authenticated, version, username }
}

/**
 * Prompt the user to install GitHub Copilot CLI
 */
async function promptInstallCopilot(): Promise<boolean> {
	logger.step("GitHub Copilot CLI is not installed. Please install it first:")
	logger.info("  macOS: brew install gh-copilot")
	logger.info("  npm:   npm install -g @githubnext/github-copilot-cli")
	logger.info("  See:   https://docs.github.com/en/copilot/how-tos/copilot-cli")
	logger.blank()
	logger.info("After installation, please run 'agent-watch init' again.")
	return false
}

/**
 * Authenticate with GitHub Copilot CLI
 */
async function authenticateCopilot(): Promise<boolean> {
	try {
		logger.step("Authenticating with GitHub Copilot CLI...")
		logger.info("Follow the prompts to authenticate:")
		execSync("copilot login", { stdio: "inherit" })
		logger.success("GitHub Copilot CLI authenticated successfully!")
		return true
	} catch (error) {
		logger.error("Failed to authenticate with GitHub Copilot CLI")
		logger.error(error instanceof Error ? error.message : String(error))
		return false
	}
}

/**
 * Setup GitHub Copilot CLI - install and configure if needed
 */
export async function setupGithubCopilotCli(): Promise<boolean> {
	logger.title("GitHub Copilot CLI Setup")

	const status = checkCopilotStatus()

	// Check Copilot CLI installation
	if (!status.installed) {
		return await promptInstallCopilot()
	}

	logger.success(`GitHub Copilot CLI is installed (v${status.version ?? "unknown"})`)

	// Check authentication
	if (!status.authenticated) {
		logger.warn("GitHub Copilot CLI is not authenticated")
		const authSuccess = await authenticateCopilot()
		if (!authSuccess) {
			return false
		}
	} else {
		logger.success(`GitHub Copilot CLI is authenticated as ${status.username}`)
	}

	// Final verification
	logger.blank()
	logger.success("GitHub Copilot CLI is ready to use!")
	logger.info("You can now use 'copilot' commands")
	logger.blank()

	return true
}

/**
 * Verify GitHub Copilot CLI is properly configured
 */
export function verifyCopilotSetup(): boolean {
	const status = checkCopilotStatus()
	return status.installed && status.authenticated
}
