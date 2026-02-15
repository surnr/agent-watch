export const PROMPT_AGENT_FILE_UPDATE = `Based on the following context, intelligently update the agent configuration files listed below. Only update if there are meaningful new patterns, conventions, or rules to document.

{{CONTEXT}}

## Agent Files to Update
{{AGENT_FILES}}

Read each file, analyze its current content, and update with new insights. Merge patterns intelligently, maintain existing structure, remove outdated info. Focus on patterns and conventions, not changelogs.`

/**
 * Build the agent file update prompt with context
 */
export function buildAgentFileUpdatePrompt(
	gitContext: string | null,
	summaries: string[],
	agentFilePaths: string[]
): string {
	const contextSections: string[] = []

	if (gitContext) {
		contextSections.push(`## Git Changes\n${gitContext}`)
	}

	if (summaries.length > 0) {
		contextSections.push(`## Pattern Summaries from Chat Sessions\n${summaries.join("\n\n")}`)
	}

	const context = contextSections.join("\n\n")
	const agentFiles = agentFilePaths.map((p) => `- ${p}`).join("\n")

	return PROMPT_AGENT_FILE_UPDATE.replace("{{CONTEXT}}", context).replace("{{AGENT_FILES}}", agentFiles)
}
