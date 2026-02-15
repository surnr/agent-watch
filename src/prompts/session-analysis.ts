export const PROMPT_SESSION_ANALYSIS = `Analyze this chat session and extract key patterns, conventions, and rules that should be documented.

Human messages:
{{HUMAN_MESSAGES}}

AI's final response:
{{AI_RESPONSE}}

Provide a concise summary of:
- Code patterns or conventions discussed
- Rules or guidelines established
- Important decisions or learnings

Be specific and actionable. If no significant patterns found, respond with exactly: "No patterns."`

/**
 * Build the session analysis prompt with content
 */
export function buildSessionAnalysisPrompt(humanMessages: string[], aiResponse: string): string {
	return PROMPT_SESSION_ANALYSIS.replace(
		"{{HUMAN_MESSAGES}}",
		humanMessages.map((msg, i) => `${i + 1}. ${msg}`).join("\n\n")
	).replace("{{AI_RESPONSE}}", aiResponse)
}
