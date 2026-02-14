import { execSync } from "node:child_process"
import { logger } from "./logger.js"

interface CopilotStatus {
	ghInstalled: boolean
	copilotInstalled: boolean
	authenticated: boolean
}

/**
 * Check if GitHub CLI (gh) is installed
 */
function isGhInstalled(): boolean {
	try {
		execSync("gh --version", { stdio: "pipe" })
		return true
	} catch {
		return false
	}
}

/**
 * Check if GitHub Copilot CLI extension is installed
 */
function isCopilotExtensionInstalled(): boolean {
	try {
		const output = execSync("gh extension list", { encoding: "utf-8", stdio: "pipe" })
		return output.includes("github/gh-copilot")
	} catch {
		return false
	}
}

/**
 * Check if GitHub CLI is authenticated
 */
function isGhAuthenticated(): boolean {
	try {
		execSync("gh auth status", { stdio: "pipe" })
		return true
	} catch {
		return false
	}
}

/**
 * Check the status of GitHub Copilot CLI
 */
export function checkCopilotStatus(): CopilotStatus {
	return {
		ghInstalled: isGhInstalled(),
		copilotInstalled: isCopilotExtensionInstalled(),
		authenticated: isGhAuthenticated(),
	}
}

/**
 * Install GitHub CLI
 */
async function installGhCli(): Promise<boolean> {
	logger.step("GitHub CLI is not installed. Please install it first:")
	logger.info("  macOS: brew install gh")
	logger.info("  Windows: winget install --id GitHub.cli")
	logger.info("  Linux: See https://github.com/cli/cli#installation")
	logger.blank()
	logger.info("After installation, please run 'agent-watch init' again.")
	return false
}

/**
 * Install GitHub Copilot CLI extension
 */
async function installCopilotExtension(): Promise<boolean> {
	try {
		logger.step("Installing GitHub Copilot CLI extension...")
		execSync("gh extension install github/gh-copilot", { stdio: "inherit" })
		logger.success("GitHub Copilot CLI extension installed successfully!")
		return true
	} catch (error) {
		logger.error("Failed to install GitHub Copilot CLI extension")
		logger.error(error instanceof Error ? error.message : String(error))
		return false
	}
}

/**
 * Authenticate with GitHub CLI
 */
async function authenticateGh(): Promise<boolean> {
	try {
		logger.step("Authenticating with GitHub CLI...")
		logger.info("Follow the prompts to authenticate:")
		execSync("gh auth login", { stdio: "inherit" })
		logger.success("GitHub CLI authenticated successfully!")
		return true
	} catch (error) {
		logger.error("Failed to authenticate with GitHub CLI")
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

	// Check GitHub CLI installation
	if (!status.ghInstalled) {
		return await installGhCli()
	}

	logger.success("GitHub CLI is installed")

	// Check authentication
	if (!status.authenticated) {
		logger.warn("GitHub CLI is not authenticated")
		const authSuccess = await authenticateGh()
		if (!authSuccess) {
			return false
		}
	} else {
		logger.success("GitHub CLI is authenticated")
	}

	// Check Copilot extension
	if (!status.copilotInstalled) {
		logger.warn("GitHub Copilot CLI extension is not installed")
		const installSuccess = await installCopilotExtension()
		if (!installSuccess) {
			return false
		}
	} else {
		logger.success("GitHub Copilot CLI extension is installed")
	}

	// Final verification
	logger.blank()
	logger.success("GitHub Copilot CLI is ready to use!")
	logger.info("You can now use 'gh copilot' commands")
	logger.blank()

	return true
}

/**
 * Verify GitHub Copilot CLI is properly configured
 */
export function verifyCopilotSetup(): boolean {
	const status = checkCopilotStatus()
	return status.ghInstalled && status.copilotInstalled && status.authenticated
}
