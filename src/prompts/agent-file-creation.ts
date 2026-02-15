/**
 * Build the agent file creation prompt
 */
export function buildAgentFileCreationPrompt(filePath: string): string {
	return `Create a ${filePath} file for this project. Analyze the codebase to understand the project structure, tech stack, and conventions. Write the file directly.`
}
