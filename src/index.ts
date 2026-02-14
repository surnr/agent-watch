export { loadConfig, type AgentWatchConfig } from "./config.js"
export { detectAgentFiles, getExistingAgentFiles, type AgentFileInfo } from "./detect.js"
export {
	KNOWN_AGENT_FILES,
	CONFIG_FILE_NAME,
	SUPPORTED_HOOKS,
	type AgentFilePattern,
	type GitHookTrigger,
} from "./constants.js"
