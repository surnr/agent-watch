import { execSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const mockedHome = vi.hoisted(() => ({ value: "" }))

vi.mock("node:os", async () => {
	const actual = await vi.importActual<typeof import("node:os")>("node:os")
	return { ...actual, homedir: () => mockedHome.value }
})

vi.mock("node:child_process", () => ({ execSync: vi.fn() }))

vi.mock("./logger.js", () => ({
	logger: {
		step: vi.fn(),
		info: vi.fn(),
		success: vi.fn(),
		warn: vi.fn(),
	},
}))

const execSyncMock = vi.mocked(execSync)

describe("sessions", () => {
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

	it("should return empty sessions when Copilot state directory is missing", async () => {
		const { getCopilotSessions } = await import("./sessions")
		const sessions = getCopilotSessions(projectRoot)
		expect(sessions).toEqual([])
	})

	it("should filter sessions by git root and sort by updated time", async () => {
		const stateDir = join(tempHome, ".copilot", "session-state")
		mkdirSync(stateDir, { recursive: true })

		const sessionA = join(stateDir, "a")
		const sessionB = join(stateDir, "b")
		const sessionC = join(stateDir, "c")
		mkdirSync(sessionA, { recursive: true })
		mkdirSync(sessionB, { recursive: true })
		mkdirSync(sessionC, { recursive: true })

		writeFileSync(
			join(sessionA, "workspace.yaml"),
			["id: a", `cwd: ${projectRoot}`, `git_root: ${projectRoot}`, "updated_at: 2024-01-01T00:00:00Z"].join("\n"),
			"utf-8"
		)
		writeFileSync(
			join(sessionB, "workspace.yaml"),
			["id: b", `cwd: ${projectRoot}`, `git_root: ${projectRoot}`, "updated_at: 2024-02-01T00:00:00Z"].join("\n"),
			"utf-8"
		)
		writeFileSync(
			join(sessionC, "workspace.yaml"),
			["id: c", "cwd: /other", "git_root: /other", "updated_at: 2024-03-01T00:00:00Z"].join("\n"),
			"utf-8"
		)

		const { getCopilotSessions } = await import("./sessions")
		const sessions = getCopilotSessions(projectRoot)

		expect(sessions).toHaveLength(2)
		expect(sessions[0]?.id).toBe("b")
		expect(sessions[1]?.id).toBe("a")
	})

	it("should persist and load processed session IDs", async () => {
		const { getProcessedSessionIds, saveProcessedSessionIds } = await import("./sessions")
		expect(getProcessedSessionIds(projectRoot)).toEqual([])

		saveProcessedSessionIds(projectRoot, ["one", "two"])
		const loaded = getProcessedSessionIds(projectRoot)
		expect(loaded).toEqual(["one", "two"])

		const raw = readFileSync(join(projectRoot, ".agent-watch", "sessions.json"), "utf-8")
		expect(raw.endsWith("\n")).toBe(true)
	})

	it("should return unprocessed sessions only", async () => {
		const stateDir = join(tempHome, ".copilot", "session-state")
		mkdirSync(stateDir, { recursive: true })
		const sessionA = join(stateDir, "a")
		const sessionB = join(stateDir, "b")
		mkdirSync(sessionA, { recursive: true })
		mkdirSync(sessionB, { recursive: true })

		writeFileSync(
			join(sessionA, "workspace.yaml"),
			["id: a", `cwd: ${projectRoot}`, `git_root: ${projectRoot}`, "updated_at: 2024-01-01T00:00:00Z"].join("\n"),
			"utf-8"
		)
		writeFileSync(
			join(sessionB, "workspace.yaml"),
			["id: b", `cwd: ${projectRoot}`, `git_root: ${projectRoot}`, "updated_at: 2024-02-01T00:00:00Z"].join("\n"),
			"utf-8"
		)

		const { getUnprocessedSessions, saveProcessedSessionIds } = await import("./sessions")
		saveProcessedSessionIds(projectRoot, ["a"])
		const remaining = getUnprocessedSessions(projectRoot)

		expect(remaining).toHaveLength(1)
		expect(remaining[0]?.id).toBe("b")
	})

	it("should parse session output lines into conversations", async () => {
		const { parseSessionOutput } = await import("./sessions")
		const output = [
			"USER: Build hook | AGENT: Added hooks",
			"not a valid line",
			"USER: Update docs | AGENT: Drafted README",
		].join("\n")

		const conversations = parseSessionOutput(output)

		expect(conversations).toEqual([
			{ userQuery: "Build hook", agentResponse: "Added hooks" },
			{ userQuery: "Update docs", agentResponse: "Drafted README" },
		])
	})

	it("should export session content via Copilot CLI output", async () => {
		const { exportSessionContent } = await import("./sessions")
		execSyncMock.mockReturnValueOnce("USER: One | AGENT: Two\n")
		const result = exportSessionContent("abc")
		expect(result).toEqual([{ userQuery: "One", agentResponse: "Two" }])
	})

	it("should return null when no sessions are unprocessed", async () => {
		const { processNewSessions } = await import("./sessions")
		const result = processNewSessions(projectRoot)
		expect(result).toBeNull()
	})

	it("should mark sessions as processed when no conversation content is found", async () => {
		const stateDir = join(tempHome, ".copilot", "session-state")
		mkdirSync(stateDir, { recursive: true })
		const sessionA = join(stateDir, "a")
		mkdirSync(sessionA, { recursive: true })

		writeFileSync(
			join(sessionA, "workspace.yaml"),
			["id: a", `cwd: ${projectRoot}`, `git_root: ${projectRoot}`, "updated_at: 2024-01-01T00:00:00Z"].join("\n"),
			"utf-8"
		)

		const { processNewSessions } = await import("./sessions")
		execSyncMock.mockReturnValueOnce("invalid")

		const result = processNewSessions(projectRoot)
		expect(result).toBeNull()

		const raw = readFileSync(join(projectRoot, ".agent-watch", "sessions.json"), "utf-8")
		expect(raw).toContain('"a"')
	})

	it("should return conversation context and persist processed sessions", async () => {
		const stateDir = join(tempHome, ".copilot", "session-state")
		mkdirSync(stateDir, { recursive: true })
		const sessionA = join(stateDir, "a")
		mkdirSync(sessionA, { recursive: true })

		writeFileSync(
			join(sessionA, "workspace.yaml"),
			["id: a", `cwd: ${projectRoot}`, `git_root: ${projectRoot}`, "updated_at: 2024-01-01T00:00:00Z"].join("\n"),
			"utf-8"
		)

		const { processNewSessions } = await import("./sessions")
		execSyncMock.mockReturnValueOnce("USER: One | AGENT: Two\n")

		const result = processNewSessions(projectRoot)
		expect(result).toBe("User: One\nAgent: Two")

		const raw = readFileSync(join(projectRoot, ".agent-watch", "sessions.json"), "utf-8")
		expect(raw).toContain('"a"')
	})
})
