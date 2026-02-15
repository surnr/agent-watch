export interface AgentFilePattern {
	/** Relative path from project root */
	path: string
	/** Human-readable label for display */
	label: string
	/** Which AI agent/tool uses this file */
	agent: string
}

export const KNOWN_AGENT_FILES: AgentFilePattern[] = [
	{ path: "AGENTS.md", label: "AGENTS.md (Recommended)", agent: "Generic" },
	{ path: "CLAUDE.md", label: "CLAUDE.md (Claude Code)", agent: "Claude Code" },
	{
		path: ".github/copilot-instructions.md",
		label: ".github/copilot-instructions.md (GitHub Copilot)",
		agent: "GitHub Copilot",
	},
	{ path: ".cursor/rules", label: ".cursor/rules (Cursor)", agent: "Cursor" },
	{ path: ".windsurfrules", label: ".windsurfrules (Windsurf)", agent: "Windsurf" },
	{ path: ".clinerules", label: ".clinerules (Cline)", agent: "Cline" },
]

// agent-watch directory and files
export const AGENT_WATCH_DIR = ".agent-watch"
export const CONFIG_FILE_NAME = "config.json"
export const SESSIONS_STATE_FILE = "sessions.json"

export const SUPPORTED_HOOKS = ["commit", "push"] as const
export type GitHookTrigger = (typeof SUPPORTED_HOOKS)[number]

export const SUPPORTED_AI_AGENTS = [{ value: "github-copilot-cli", name: "GitHub Copilot CLI" }] as const

// Files/patterns that should NOT trigger agent-watch to run
// These are files that don't represent meaningful code changes
export const IGNORED_FILE_PATTERNS = [
	// Agent instruction files themselves (no need to analyze changes to the output files)
	"AGENTS.md",
	"agents.md",
	"CLAUDE.md",
	".github/copilot-instructions.md",
	"copilot-instructions.md",
	".cursor/rules",
	".cursorrules",
	".windsurfrules",
	".clinerules",

	// Documentation
	"README.md",
	"readme.md",
	"CHANGELOG.md",
	"changelog.md",
	"LICENSE",
	"license",
	"CONTRIBUTING.md",
	"CODE_OF_CONDUCT.md",

	// Git and version control
	".gitignore",
	".gitattributes",
	".git",

	// Package management lock files
	"package-lock.json",
	"pnpm-lock.yaml",
	"yarn.lock",
	"bun.lockb",

	// Build/tooling config (usually don't contain logic)
	".prettierrc",
	".prettierrc.json",
	".prettierrc.js",
	".eslintrc",
	".eslintrc.json",
	".eslintrc.js",
	".editorconfig",
	"tsconfig.json",
	"jsconfig.json",
	"biome.json",
	".biome.json",
	"lefthook.yml",
	"lefthook.yaml",

	// CI/CD config
	".github/workflows",
	".gitlab-ci.yml",
	".circleci",

	// IDE config
	".vscode",
	".idea",
	".DS_Store",
]

// UI Configuration
export const FILE_SELECTION_PAGE_SIZE = 10 // Static scroll limit for file selection
