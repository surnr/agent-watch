import type { AgentWatchConfig } from "../config"
import { SUPPORTED_AI_AGENTS } from "../constants"

const checkboxMock = vi.fn()
const confirmMock = vi.fn()
const selectMock = vi.fn()

vi.mock("@inquirer/prompts", () => ({
	checkbox: checkboxMock,
	confirm: confirmMock,
	select: selectMock,
}))

const loadConfigMock = vi.fn()
const saveConfigMock = vi.fn()
const createDefaultConfigMock = vi.fn()

vi.mock("../config.js", () => ({
	loadConfig: loadConfigMock,
	saveConfig: saveConfigMock,
	createDefaultConfig: createDefaultConfigMock,
}))

const detectAgentFilesMock = vi.fn()

vi.mock("../detect.js", () => ({
	detectAgentFiles: detectAgentFilesMock,
}))

const installGitHookMock = vi.fn()

vi.mock("../hooks.js", () => ({
	installGitHook: installGitHookMock,
}))

const createMissingAgentFilesMock = vi.fn()
const setupGithubCopilotCliMock = vi.fn()

vi.mock("../utils/copilot.js", () => ({
	createMissingAgentFiles: createMissingAgentFilesMock,
	setupGithubCopilotCli: setupGithubCopilotCliMock,
}))

const findGitRootMock = vi.fn()

vi.mock("../utils/git.js", () => ({
	findGitRoot: findGitRootMock,
}))

const loggerMock = {
	asciiArt: vi.fn(),
	info: vi.fn(),
	success: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	blank: vi.fn(),
}

vi.mock("../utils/logger.js", () => ({
	logger: loggerMock,
}))

function getFakeConfig(overrides: Partial<AgentWatchConfig> = {}): AgentWatchConfig {
	return {
		version: 1,
		agentFiles: [],
		watchFileChanges: true,
		includeChatSession: true,
		hookTrigger: "commit",
		agents: [],
		...overrides,
	}
}

describe("initCommand", () => {
	beforeEach(() => {
		checkboxMock.mockReset()
		confirmMock.mockReset()
		selectMock.mockReset()
		loadConfigMock.mockReset()
		saveConfigMock.mockReset()
		createDefaultConfigMock.mockReset()
		detectAgentFilesMock.mockReset()
		installGitHookMock.mockReset()
		createMissingAgentFilesMock.mockReset()
		setupGithubCopilotCliMock.mockReset()
		findGitRootMock.mockReset()

		loggerMock.asciiArt.mockReset()
		loggerMock.info.mockReset()
		loggerMock.success.mockReset()
		loggerMock.warn.mockReset()
		loggerMock.error.mockReset()
		loggerMock.blank.mockReset()
	})

	it("should exit when not inside a git repository", async () => {
		findGitRootMock.mockReturnValueOnce(null)
		const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
			throw new Error(`exit ${code}`)
		}) as never)

		const { initCommand } = await import("./init")
		await expect(initCommand()).rejects.toThrow("exit 1")

		expect(loggerMock.error).toHaveBeenCalled()
		exitSpy.mockRestore()
	})

	it("should not overwrite config when user declines", async () => {
		findGitRootMock.mockReturnValueOnce("/repo")
		loadConfigMock.mockReturnValueOnce(getFakeConfig())
		confirmMock.mockResolvedValueOnce(false)

		const { initCommand } = await import("./init")
		await initCommand()

		expect(saveConfigMock).not.toHaveBeenCalled()
		expect(installGitHookMock).not.toHaveBeenCalled()
		expect(loggerMock.info).toHaveBeenCalledWith("Init cancelled. Existing configuration preserved.")
	})

	it("should create config and install hook with selected options", async () => {
		findGitRootMock.mockReturnValueOnce("/repo")
		loadConfigMock.mockReturnValueOnce(null)
		detectAgentFilesMock.mockReturnValueOnce([
			{
				pattern: { path: "AGENTS.md", label: "AGENTS.md", agent: "Generic" },
				exists: true,
				absolutePath: "/repo/AGENTS.md",
			},
		])

		checkboxMock
			.mockResolvedValueOnce(["AGENTS.md"])
			.mockResolvedValueOnce(["watchFileChanges"])
			.mockResolvedValueOnce([SUPPORTED_AI_AGENTS[0]?.value])

		selectMock.mockResolvedValueOnce("push")

		setupGithubCopilotCliMock.mockResolvedValueOnce(true)
		installGitHookMock.mockReturnValueOnce({ success: true, message: "ok", method: "direct" })

		const config = getFakeConfig({
			agentFiles: ["AGENTS.md"],
			watchFileChanges: true,
			includeChatSession: false,
			hookTrigger: "push",
			agents: [SUPPORTED_AI_AGENTS[0]?.value ?? "github-copilot-cli"],
		})
		createDefaultConfigMock.mockReturnValueOnce(config)

		const { initCommand } = await import("./init")
		await initCommand()

		expect(createMissingAgentFilesMock).toHaveBeenCalledWith("/repo", ["AGENTS.md"], expect.any(Array))
		expect(setupGithubCopilotCliMock).toHaveBeenCalled()
		expect(saveConfigMock).toHaveBeenCalledWith("/repo", config)
		expect(installGitHookMock).toHaveBeenCalledWith("/repo", "/repo", "push")
	})
})
