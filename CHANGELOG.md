# Changelog

## 1.1.0

### Minor Changes

- Enhance session extraction architecture with tool-specific extractors for Claude Code, Copilot Chat, and Copilot CLI. Refactor session handling code for better maintainability and add comprehensive documentation.

## 1.0.1

### Patch Changes

- Add debug mode with --debug flag for troubleshooting, improve documentation, and remove obsolete workflows

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-15

### Added

- Initial release of agent-watch
- CLI tool for keeping AI agent configuration files in sync with your codebase
- Interactive setup command `agent-watch init` with guided configuration
- Git hook integration with auto-detection for:
  - Lefthook
  - Husky
  - Direct `.git/hooks/` installation
- Support for multiple AI agent configuration files:
  - `CLAUDE.md` (Claude Code)
  - `.github/copilot-instructions.md` and `copilot-instructions.md` (GitHub Copilot)
  - `AGENTS.md` / `agents.md` (Generic)
  - `.cursorrules` / `.cursor/rules` (Cursor)
  - `.windsurfrules` (Windsurf)
  - `.clinerules` (Cline)
- Git context gathering from:
  - Commit messages
  - Changed files
  - AI chat sessions (GitHub Copilot CLI support)
- Smart filtering to skip runs when only documentation/config files are modified
- Configurable hook triggers (post-commit or pre-push)
- Programmatic API for library usage:
  - `loadConfig()` - Load agent-watch configuration
  - `detectAgentFiles()` - Auto-detect agent files in project
  - `KNOWN_AGENT_FILES` - List of supported agent file patterns
- Idempotent hook installation (safe to re-run)
- Configuration file `.agent-watch.json` for project settings

[1.0.0]: https://github.com/surnr/agent-watch/releases/tag/v1.0.0
