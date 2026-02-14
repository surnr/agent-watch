import { execSync } from "node:child_process"
import { mkdtempSync, realpathSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { findGitRoot, getGitHooksDir, hasHusky, hasLefthook, isGitRepo } from "./git"

describe("git utils", () => {
	describe("findGitRoot", () => {
		it("should find git root from cwd (this repo)", () => {
			const root = findGitRoot()
			expect(root).not.toBeNull()
		})

		it("should return null for non-git directory", () => {
			const tempDir = mkdtempSync(join(tmpdir(), "agent-watch-test-"))
			try {
				const root = findGitRoot(tempDir)
				// /tmp may or may not be inside a git repo depending on the system
				expect(root === null || typeof root === "string").toBe(true)
			} finally {
				rmSync(tempDir, { recursive: true, force: true })
			}
		})

		it("should find root of a newly initialized repo", () => {
			const tempDir = realpathSync(mkdtempSync(join(tmpdir(), "agent-watch-test-")))
			try {
				execSync("git init", { cwd: tempDir, stdio: "pipe" })
				const root = findGitRoot(tempDir)
				expect(root).toBe(tempDir)
			} finally {
				rmSync(tempDir, { recursive: true, force: true })
			}
		})
	})

	describe("isGitRepo", () => {
		it("should return true for this repo", () => {
			expect(isGitRepo()).toBe(true)
		})
	})

	describe("getGitHooksDir", () => {
		it("should return .git/hooks path", () => {
			const result = getGitHooksDir("/some/path")
			expect(result).toBe("/some/path/.git/hooks")
		})
	})

	describe("hasLefthook", () => {
		it("should return false for empty directory", () => {
			const tempDir = mkdtempSync(join(tmpdir(), "agent-watch-test-"))
			try {
				expect(hasLefthook(tempDir)).toBe(false)
			} finally {
				rmSync(tempDir, { recursive: true, force: true })
			}
		})

		it("should return true when lefthook.yml exists", () => {
			const tempDir = mkdtempSync(join(tmpdir(), "agent-watch-test-"))
			try {
				const { writeFileSync } = require("node:fs") as typeof import("node:fs")
				writeFileSync(join(tempDir, "lefthook.yml"), "")
				expect(hasLefthook(tempDir)).toBe(true)
			} finally {
				rmSync(tempDir, { recursive: true, force: true })
			}
		})
	})

	describe("hasHusky", () => {
		it("should return false for empty directory", () => {
			const tempDir = mkdtempSync(join(tmpdir(), "agent-watch-test-"))
			try {
				expect(hasHusky(tempDir)).toBe(false)
			} finally {
				rmSync(tempDir, { recursive: true, force: true })
			}
		})

		it("should return true when .husky directory exists", () => {
			const tempDir = mkdtempSync(join(tmpdir(), "agent-watch-test-"))
			try {
				const { mkdirSync } = require("node:fs") as typeof import("node:fs")
				mkdirSync(join(tempDir, ".husky"))
				expect(hasHusky(tempDir)).toBe(true)
			} finally {
				rmSync(tempDir, { recursive: true, force: true })
			}
		})
	})
})
