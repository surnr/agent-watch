import { describe, expect, it } from "vitest"
import { IGNORED_FILE_PATTERNS } from "../constants.js"

/**
 * Test helper: Check if a file path should be ignored
 * (Extracted logic from run.ts for testing)
 */
function shouldIgnoreFile(filePath: string): boolean {
	const normalizedPath = filePath.replace(/\\/g, "/")

	for (const pattern of IGNORED_FILE_PATTERNS) {
		const normalizedPattern = pattern.replace(/\\/g, "/")

		// Exact match
		if (normalizedPath === normalizedPattern) {
			return true
		}

		// Directory match
		if (normalizedPath.startsWith(`${normalizedPattern}/`)) {
			return true
		}

		// Filename match anywhere in path
		const fileName = normalizedPath.split("/").pop()
		if (fileName === normalizedPattern) {
			return true
		}
	}

	return false
}

/**
 * Test helper: Check if all modified files should be ignored
 */
function shouldSkipAnalysis(modifiedFiles: string[]): boolean {
	if (modifiedFiles.length === 0) {
		return true
	}

	return modifiedFiles.every(shouldIgnoreFile)
}

describe("run command - file filtering", () => {
	describe("shouldIgnoreFile", () => {
		it("should ignore agent instruction files", () => {
			expect(shouldIgnoreFile("AGENTS.md")).toBe(true)
			expect(shouldIgnoreFile("CLAUDE.md")).toBe(true)
			expect(shouldIgnoreFile(".cursor/rules")).toBe(true)
			expect(shouldIgnoreFile(".windsurfrules")).toBe(true)
			expect(shouldIgnoreFile(".github/copilot-instructions.md")).toBe(true)
		})

		it("should ignore documentation files", () => {
			expect(shouldIgnoreFile("README.md")).toBe(true)
			expect(shouldIgnoreFile("CHANGELOG.md")).toBe(true)
			expect(shouldIgnoreFile("LICENSE")).toBe(true)
			expect(shouldIgnoreFile("CONTRIBUTING.md")).toBe(true)
		})

		it("should ignore documentation files in subdirectories", () => {
			expect(shouldIgnoreFile("docs/README.md")).toBe(true)
			expect(shouldIgnoreFile("packages/core/README.md")).toBe(true)
		})

		it("should ignore git config files", () => {
			expect(shouldIgnoreFile(".gitignore")).toBe(true)
			expect(shouldIgnoreFile(".gitattributes")).toBe(true)
		})

		it("should ignore lock files", () => {
			expect(shouldIgnoreFile("package-lock.json")).toBe(true)
			expect(shouldIgnoreFile("pnpm-lock.yaml")).toBe(true)
			expect(shouldIgnoreFile("yarn.lock")).toBe(true)
		})

		it("should ignore build/tooling config", () => {
			expect(shouldIgnoreFile("tsconfig.json")).toBe(true)
			expect(shouldIgnoreFile(".prettierrc")).toBe(true)
			expect(shouldIgnoreFile(".eslintrc.json")).toBe(true)
			expect(shouldIgnoreFile("lefthook.yml")).toBe(true)
		})

		it("should ignore CI/CD workflow files", () => {
			expect(shouldIgnoreFile(".github/workflows/test.yml")).toBe(true)
			expect(shouldIgnoreFile(".github/workflows/release.yml")).toBe(true)
		})

		it("should NOT ignore source code files", () => {
			expect(shouldIgnoreFile("src/index.ts")).toBe(false)
			expect(shouldIgnoreFile("src/commands/run.ts")).toBe(false)
			expect(shouldIgnoreFile("lib/utils.js")).toBe(false)
			expect(shouldIgnoreFile("app.py")).toBe(false)
		})

		it("should NOT ignore test files", () => {
			expect(shouldIgnoreFile("src/index.test.ts")).toBe(false)
			expect(shouldIgnoreFile("tests/integration.spec.js")).toBe(false)
		})

		it("should NOT ignore package.json (can contain scripts/deps changes)", () => {
			expect(shouldIgnoreFile("package.json")).toBe(false)
		})
	})

	describe("shouldSkipAnalysis", () => {
		it("should skip when only ignored files are modified", () => {
			const files = ["README.md", ".gitignore", "CHANGELOG.md"]
			expect(shouldSkipAnalysis(files)).toBe(true)
		})

		it("should skip when only agent files are modified", () => {
			const files = ["AGENTS.md", "CLAUDE.md"]
			expect(shouldSkipAnalysis(files)).toBe(true)
		})

		it("should NOT skip when source code is modified", () => {
			const files = ["src/index.ts", "README.md"]
			expect(shouldSkipAnalysis(files)).toBe(false)
		})

		it("should NOT skip when only source code is modified", () => {
			const files = ["src/commands/run.ts", "src/utils/git.ts"]
			expect(shouldSkipAnalysis(files)).toBe(false)
		})

		it("should skip when no files are modified", () => {
			expect(shouldSkipAnalysis([])).toBe(true)
		})

		it("should NOT skip when package.json is modified", () => {
			const files = ["package.json"]
			expect(shouldSkipAnalysis(files)).toBe(false)
		})

		it("should NOT skip mixed relevant and ignored files", () => {
			const files = ["src/app.ts", ".gitignore", "README.md"]
			expect(shouldSkipAnalysis(files)).toBe(false)
		})
	})
})
