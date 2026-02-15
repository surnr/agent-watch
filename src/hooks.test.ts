import { execSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
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

	it("should auto-install lefthook hook when lefthook.yml exists", { timeout: 35000 }, () => {
		writeFileSync(join(tempDir, "lefthook.yml"), "pre-commit:\n  commands: {}")
		const result = installGitHook(tempDir, tempDir, "commit")
		expect(result.success).toBe(true)
		expect(result.method).toBe("lefthook")

		// Verify lefthook.yml was updated
		const content = readFileSync(join(tempDir, "lefthook.yml"), "utf-8")
		expect(content).toContain("post-commit:")
		expect(content).toContain("agent-watch:")
		expect(content).toContain("npx agent-watch run")
	})

	it("should auto-install husky hook when .husky exists", () => {
		mkdirSync(join(tempDir, ".husky"), { recursive: true })
		const result = installGitHook(tempDir, tempDir, "commit")
		expect(result.success).toBe(true)
		expect(result.method).toBe("husky")
		// Note: Actual husky add may fail without husky installed, but should return success with instructions
	})

	it("should handle empty lefthook.yml by creating full structure", () => {
		writeFileSync(join(tempDir, "lefthook.yml"), "")
		const result = installGitHook(tempDir, tempDir, "commit")
		expect(result.success).toBe(true)
		expect(result.method).toBe("lefthook")

		const content = readFileSync(join(tempDir, "lefthook.yml"), "utf-8")
		expect(content).toContain("post-commit:")
		expect(content).toContain("commands:")
		expect(content).toContain("agent-watch:")
		expect(content).toContain("npx agent-watch run")
	})

	it("should append to existing lefthook.yml with other hooks", () => {
		const initialContent = `pre-commit:
  parallel: true
  commands:
    check:
      run: pnpm run check
`
		writeFileSync(join(tempDir, "lefthook.yml"), initialContent)
		const result = installGitHook(tempDir, tempDir, "commit")
		expect(result.success).toBe(true)

		const content = readFileSync(join(tempDir, "lefthook.yml"), "utf-8")
		// Should preserve existing content
		expect(content).toContain("pre-commit:")
		expect(content).toContain("pnpm run check")
		// Should add new hook
		expect(content).toContain("post-commit:")
		expect(content).toContain("agent-watch:")
	})

	it("should be idempotent - re-running should update not duplicate", () => {
		writeFileSync(join(tempDir, "lefthook.yml"), "pre-commit:\n  commands: {}")

		// First install
		installGitHook(tempDir, tempDir, "commit")

		// Second install (should update, not duplicate)
		installGitHook(tempDir, tempDir, "commit")
		const content = readFileSync(join(tempDir, "lefthook.yml"), "utf-8")

		// Should only have one instance of agent-watch
		const matches = content.match(/agent-watch:/g)
		expect(matches).toHaveLength(1)
	})

	it("should reject lefthook.yml with tabs", () => {
		const contentWithTabs = "pre-commit:\n\tcommands: {}"
		writeFileSync(join(tempDir, "lefthook.yml"), contentWithTabs)
		const result = installGitHook(tempDir, tempDir, "commit")

		expect(result.success).toBe(true)
		expect(result.method).toBe("lefthook")
		expect(result.message).toContain("complex structure")
		expect(result.message).toContain("manually")
	})

	it("should handle husky hook that already contains agent-watch", () => {
		const huskyDir = join(tempDir, ".husky")
		mkdirSync(huskyDir, { recursive: true })

		const hookPath = join(huskyDir, "post-commit")
		writeFileSync(hookPath, "#!/bin/sh\nnpx agent-watch run\n")

		const result = installGitHook(tempDir, tempDir, "commit")
		expect(result.success).toBe(true)
		expect(result.message).toContain("already configured")
	})

	it("should add commands section if missing in lefthook.yml", () => {
		const content = "post-commit:\n  parallel: true\n"
		writeFileSync(join(tempDir, "lefthook.yml"), content)

		const result = installGitHook(tempDir, tempDir, "commit")
		expect(result.success).toBe(true)

		const updatedContent = readFileSync(join(tempDir, "lefthook.yml"), "utf-8")
		expect(updatedContent).toContain("commands:")
		expect(updatedContent).toContain("agent-watch:")
	})
})
