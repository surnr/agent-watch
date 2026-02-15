import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createDefaultConfig, loadConfig, saveConfig } from "./config"

describe("config", () => {
	let tempDir: string

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "agent-watch-test-"))
	})

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true })
	})

	describe("loadConfig", () => {
		it("should return null when no config exists", () => {
			expect(loadConfig(tempDir)).toBeNull()
		})

		it("should return null for invalid JSON", () => {
			const { mkdirSync } = require("node:fs") as typeof import("node:fs")
			const agentWatchDir = join(tempDir, ".agent-watch")
			mkdirSync(agentWatchDir, { recursive: true })
			const configPath = join(agentWatchDir, "config.json")
			const { writeFileSync } = require("node:fs") as typeof import("node:fs")
			writeFileSync(configPath, "not valid json", "utf-8")
			expect(loadConfig(tempDir)).toBeNull()
		})

		it("should load valid config", () => {
			const config = createDefaultConfig({ agentFiles: ["CLAUDE.md"] })
			saveConfig(tempDir, config)
			const loaded = loadConfig(tempDir)
			expect(loaded).toEqual(config)
		})
	})

	describe("saveConfig", () => {
		it("should save config as formatted JSON", () => {
			const config = createDefaultConfig({ agentFiles: [".cursor/rules"] })
			saveConfig(tempDir, config)
			const raw = readFileSync(join(tempDir, ".agent-watch", "config.json"), "utf-8")
			expect(raw).toContain('"version": 1')
			expect(raw).toContain('".cursor/rules"')
			expect(raw.endsWith("\n")).toBe(true)
		})
	})

	describe("createDefaultConfig", () => {
		it("should create valid default config", () => {
			const config = createDefaultConfig()
			expect(config.version).toBe(1)
			expect(config.agentFiles).toEqual([])
			expect(config.watchFileChanges).toBe(true)
			expect(config.includeChatSession).toBe(true)
			expect(config.hookTrigger).toBe("commit")
			expect(config.agents).toEqual([])
		})

		it("should apply overrides", () => {
			const config = createDefaultConfig({
				agentFiles: ["CLAUDE.md", "AGENTS.md"],
				hookTrigger: "push",
				agents: ["github-copilot-cli"],
				watchFileChanges: false,
			})
			expect(config.agentFiles).toEqual(["CLAUDE.md", "AGENTS.md"])
			expect(config.hookTrigger).toBe("push")
			expect(config.agents).toEqual(["github-copilot-cli"])
			expect(config.watchFileChanges).toBe(false)
			expect(config.includeChatSession).toBe(true)
			expect(config.version).toBe(1)
		})
	})
})
