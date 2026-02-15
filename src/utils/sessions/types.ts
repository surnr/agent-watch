/**
 * Core types for multi-tool session extraction system
 */

/**
 * Session metadata from any AI tool
 */
export interface Session {
	/** Unique session identifier */
	id: string
	/** AI tool that created this session */
	toolId: "claude-code" | "github-copilot-cli" | "github-copilot-chat"
	/** Absolute path to project */
	projectPath: string
	/** Git branch if available */
	branch?: string
	/** ISO timestamp when session was created */
	createdAt: string
	/** ISO timestamp when session was last modified */
	updatedAt: string
	/** Number of messages in the session */
	messageCount?: number
}

/**
 * Extracted content from a session for summarization.
 * Only includes human messages and AI's final response to keep summaries focused.
 */
export interface SessionContent {
	/** All human/user messages in the session */
	humanMessages: string[]
	/** AI's final/last response */
	aiResponse: string
}

/**
 * Interface that each tool-specific extractor must implement
 */
export interface SessionExtractor {
	/** Tool identifier */
	readonly toolId: string

	/**
	 * Get sessions for a project, sorted by most recent first
	 * @param projectRoot Absolute path to project root
	 * @param limit Maximum number of sessions to return (default 3)
	 * @returns Array of session metadata
	 */
	getSessions(projectRoot: string, limit: number): Session[]

	/**
	 * Extract human messages and AI's final response from a session
	 * @param session Session metadata
	 * @returns Extracted content for summarization
	 */
	extractContent(session: Session): SessionContent
}

/**
 * State data for tracking processed sessions per tool
 */
export interface SessionStateData {
	processedSessions: {
		[toolId: string]: string[]
	}
}
