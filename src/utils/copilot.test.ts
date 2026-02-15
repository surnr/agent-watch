import { execSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { KNOWN_AGENT_FILES } from "../constants"

const mockedHome = vi.hoisted(() => ({ value: "" }))

vi.mock("node:os", async () => {
	const actual = await vi.importActual<typeof import("node:os")>("node:os")
	return { ...actual, homedir: () => mockedHome.value }
})

vi.mock("node:child_process", () => ({ execSync: vi.fn() }))

vi.mock("./logger.js", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		success: vi.fn(),
		step: vi.fn(),
		blank: vi.fn(),
	},
}))

const execSyncMock = vi.mocked(execSync)

describe("copilot utils", () => {
	let tempHome: string
	let projectRoot: string

	beforeEach(() => {
		tempHome = mkdtempSync(join(tmpdir(), "agent-watch-home-"))
		projectRoot = join(tempHome, "repo")
		mkdirSync(projectRoot, { recursive: true })
		mockedHome.value = tempHome
		execSyncMock.mockReset()
		vi.resetModules()
	})

	afterEach(() => {
		rmSync(tempHome, { recursive: true, force: true })
	})

	it("should report Copilot status with version and username", async () => {
		const configDir = join(tempHome, ".copilot")
		mkdirSync(configDir, { recursive: true })
		writeFileSync(
			join(configDir, "config.json"),
			JSON.stringify({ logged_in_users: [{ host: "github.com", login: "octo" }] }),
			"utf-8"
		)

		execSyncMock.mockReturnValueOnce("copilot 1.2.3")
		const { checkCopilotStatus } = await import("./copilot")
		const status = checkCopilotStatus()

		expect(status).toEqual({ installed: true, authenticated: true, version: "1.2.3", username: "octo" })
	})

	it("should fail verification when unauthenticated", async () => {
		execSyncMock.mockReturnValueOnce("copilot 1.2.3")
		const { verifyCopilotSetup } = await import("./copilot")
		expect(verifyCopilotSetup()).toBe(false)
	})

	it("should return false when Copilot CLI is not installed", async () => {
		execSyncMock.mockImplementationOnce(() => {
			throw new Error("missing")
		})
		const { setupGithubCopilotCli } = await import("./copilot")
		const result = await setupGithubCopilotCli()
		expect(result).toBe(false)
	})

	it("should authenticate when Copilot CLI is installed but not logged in", async () => {
		execSyncMock.mockReturnValueOnce("copilot 1.2.3").mockReturnValueOnce("")

		const { setupGithubCopilotCli } = await import("./copilot")
		const result = await setupGithubCopilotCli()

		expect(result).toBe(true)
		expect(execSyncMock).toHaveBeenCalledWith("copilot login", { stdio: "inherit" })
	})

	it("should create missing agent files using Copilot CLI", async () => {
		const { createMissingAgentFiles } = await import("./copilot")
		const selectedFiles = [".github/copilot-instructions.md", "AGENTS.md"]
		const detectedFiles = selectedFiles.map((path) => {
			const pattern = KNOWN_AGENT_FILES.find((file) => file.path === path)
			if (!pattern) {
				throw new Error(`Pattern not found for path: ${path}`)
			}
			return {
				pattern,
				exists: false,
				absolutePath: join(projectRoot, path),
			}
		})

		createMissingAgentFiles(projectRoot, selectedFiles, detectedFiles)

		expect(execSyncMock).toHaveBeenCalledWith("copilot init", {
			cwd: projectRoot,
			stdio: "pipe",
			timeout: 120_000,
		})
		expect(execSyncMock).toHaveBeenCalledWith(
			expect.stringContaining('copilot -p "Create a AGENTS.md file for this project.'),
			{
				cwd: projectRoot,
				stdio: "pipe",
				timeout: 120_000,
			}
		)
	})
})
