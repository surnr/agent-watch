import { execSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { installGitHook } from "./hooks"

describe("installGitHook", () => {
	let tempDir: string

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "agent-watch-test-"))
		// Initialize a git repo so .git/hooks exists
		execSync("git init", { cwd: tempDir, stdio: "pipe" })
	})

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true })
	})

	it("should create post-commit hook for commit trigger", () => {
		const result = installGitHook(tempDir, tempDir, "commit")
		expect(result.success).toBe(true)
		expect(result.method).toBe("direct")

		const hookPath = join(tempDir, ".git", "hooks", "post-commit")
		expect(existsSync(hookPath)).toBe(true)

		const content = readFileSync(hookPath, "utf-8")
		expect(content).toContain("#!/bin/sh")
		expect(content).toContain("agent-watch hook start")
		expect(content).toContain("npx agent-watch run")
	})

	it("should create pre-push hook for push trigger", () => {
		const result = installGitHook(tempDir, tempDir, "push")
		expect(result.success).toBe(true)

		const hookPath = join(tempDir, ".git", "hooks", "pre-push")
		expect(existsSync(hookPath)).toBe(true)
	})

	it("should append to existing hook file", () => {
		const hooksDir = join(tempDir, ".git", "hooks")
		mkdirSync(hooksDir, { recursive: true })
		writeFileSync(join(hooksDir, "post-commit"), "#!/bin/sh\necho existing\n", "utf-8")

		const result = installGitHook(tempDir, tempDir, "commit")
		expect(result.success).toBe(true)

		const content = readFileSync(join(hooksDir, "post-commit"), "utf-8")
		expect(content).toContain("echo existing")
		expect(content).toContain("agent-watch hook start")
	})

	it("should replace existing agent-watch section on re-run", () => {
		installGitHook(tempDir, tempDir, "commit")
		installGitHook(tempDir, tempDir, "commit")

		const hookPath = join(tempDir, ".git", "hooks", "post-commit")
		const content = readFileSync(hookPath, "utf-8")

		// Should only contain one instance of the marker
		const matches = content.match(/agent-watch hook start/g)
		expect(matches).toHaveLength(1)
	})

	it("should return lefthook instructions when lefthook.yml exists", () => {
		writeFileSync(join(tempDir, "lefthook.yml"), "pre-commit:\n  commands: {}")
		const result = installGitHook(tempDir, tempDir, "commit")
		expect(result.success).toBe(true)
		expect(result.method).toBe("lefthook")
		expect(result.message).toContain("Lefthook detected")
	})

	it("should return husky instructions when .husky exists", () => {
		mkdirSync(join(tempDir, ".husky"), { recursive: true })
		const result = installGitHook(tempDir, tempDir, "commit")
		expect(result.success).toBe(true)
		expect(result.method).toBe("husky")
		expect(result.message).toContain("Husky detected")
	})
})
