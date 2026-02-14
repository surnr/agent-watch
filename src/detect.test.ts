import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { detectAgentFiles, getExistingAgentFiles } from "./detect"

describe("detectAgentFiles", () => {
	let tempDir: string

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "agent-watch-test-"))
	})

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true })
	})

	it("should return all known patterns with exists=false for empty directory", () => {
		const results = detectAgentFiles(tempDir)
		expect(results.length).toBeGreaterThan(0)
		for (const r of results) {
			expect(r.exists).toBe(false)
		}
	})

	it("should detect CLAUDE.md when it exists", () => {
		writeFileSync(join(tempDir, "CLAUDE.md"), "# Claude config")
		const results = detectAgentFiles(tempDir)
		const claude = results.find((r) => r.pattern.path === "CLAUDE.md")
		expect(claude).toBeDefined()
		expect(claude?.exists).toBe(true)
	})

	it("should detect .cursorrules when it exists", () => {
		writeFileSync(join(tempDir, ".cursorrules"), "rules")
		const results = detectAgentFiles(tempDir)
		const cursor = results.find((r) => r.pattern.path === ".cursorrules")
		expect(cursor).toBeDefined()
		expect(cursor?.exists).toBe(true)
	})

	it("should detect .github/copilot-instructions.md", () => {
		mkdirSync(join(tempDir, ".github"), { recursive: true })
		writeFileSync(join(tempDir, ".github", "copilot-instructions.md"), "# Copilot")
		const results = detectAgentFiles(tempDir)
		const copilot = results.find((r) => r.pattern.path === ".github/copilot-instructions.md")
		expect(copilot).toBeDefined()
		expect(copilot?.exists).toBe(true)
	})
})

describe("getExistingAgentFiles", () => {
	let tempDir: string

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "agent-watch-test-"))
	})

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true })
	})

	it("should return empty array when no agent files exist", () => {
		const existing = getExistingAgentFiles(tempDir)
		expect(existing).toHaveLength(0)
	})

	it("should return only existing files", () => {
		writeFileSync(join(tempDir, "CLAUDE.md"), "")
		writeFileSync(join(tempDir, ".cursorrules"), "")
		const existing = getExistingAgentFiles(tempDir)
		expect(existing).toHaveLength(2)
		const paths = existing.map((f) => f.pattern.path)
		expect(paths).toContain("CLAUDE.md")
		expect(paths).toContain(".cursorrules")
	})
})
