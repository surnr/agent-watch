export { loadConfig, type AgentWatchConfig } from "./config.js"
export { detectAgentFiles, getExistingAgentFiles, type AgentFileInfo } from "./detect.js"
export {
	KNOWN_AGENT_FILES,
	CONFIG_FILE_NAME,
	SESSIONS_STATE_FILE,
	SUPPORTED_HOOKS,
	type AgentFilePattern,
	type GitHookTrigger,
} from "./constants.js"
export {
	processAllSessions,
	getProcessedSessionIds,
	markSessionsAsProcessed,
	clearProcessedSessions,
	type Session,
	type SessionContent,
	type SessionExtractor,
} from "./utils/sessions/index.js"
