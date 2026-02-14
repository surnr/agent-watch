export interface AgentFilePattern {
	/** Relative path from project root */
	path: string
	/** Human-readable label for display */
	label: string
	/** Which AI agent/tool uses this file */
	agent: string
}

export const KNOWN_AGENT_FILES: AgentFilePattern[] = [
	{ path: "CLAUDE.md", label: "CLAUDE.md (Claude Code)", agent: "Claude Code" },
	{
		path: ".github/copilot-instructions.md",
		label: ".github/copilot-instructions.md (GitHub Copilot)",
		agent: "GitHub Copilot",
	},
	{ path: "copilot-instructions.md", label: "copilot-instructions.md (GitHub Copilot)", agent: "GitHub Copilot" },
	{ path: "AGENTS.md", label: "AGENTS.md (Generic)", agent: "Generic" },
	{ path: "agents.md", label: "agents.md (Generic)", agent: "Generic" },
	{ path: ".cursorrules", label: ".cursorrules (Cursor)", agent: "Cursor" },
	{ path: ".cursor/rules", label: ".cursor/rules (Cursor)", agent: "Cursor" },
	{ path: ".windsurfrules", label: ".windsurfrules (Windsurf)", agent: "Windsurf" },
	{ path: ".clinerules", label: ".clinerules (Cline)", agent: "Cline" },
]

export const CONFIG_FILE_NAME = ".agent-watch.json"

export const SUPPORTED_HOOKS = ["commit", "push"] as const
export type GitHookTrigger = (typeof SUPPORTED_HOOKS)[number]

export const SUPPORTED_AI_AGENTS = [{ value: "github-copilot-cli", name: "GitHub Copilot CLI" }] as const
