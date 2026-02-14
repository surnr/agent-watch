# agent-watch

CLI tool that uses git hooks to keep your AI agent configuration files in sync with your codebase. It watches for commits or pushes, gathers context from git changes and chat sessions, and automatically updates your agent files.

## Install

```bash
npm install -g agent-watch
```

Or run directly:

```bash
npx agent-watch init
```

## Quick start

```bash
cd your-project
agent-watch init
```

The `init` command walks you through an interactive setup:

1. **Select agent files** - auto-detects existing files and lets you pick which ones to manage (space to toggle, enter to confirm)
2. **Git context** - choose whether to use commit messages and chat sessions when updating files
3. **Hook trigger** - pick when to run: after `git commit` or before `git push`
4. **AI agents** - select which agent integrations to enable (GitHub Copilot CLI, more coming)

Your choices are saved to `.agent-watch.json` in the project root.

## Supported agent files

| File | Agent |
|------|-------|
| `CLAUDE.md` | Claude Code |
| `.github/copilot-instructions.md` | GitHub Copilot |
| `copilot-instructions.md` | GitHub Copilot |
| `AGENTS.md` / `agents.md` | Generic |
| `.cursorrules` / `.cursor/rules` | Cursor |
| `.windsurfrules` | Windsurf |
| `.clinerules` | Cline |

## How it works

After running `agent-watch init`:

- A git hook is installed (or instructions are provided if you use lefthook/husky)
- On each commit or push (depending on your config), agent-watch gathers context from:
  - Changed files in the commit
  - Git commit messages
  - Chat sessions from supported AI tools
- It uses this context to update your selected agent configuration files

## Configuration

The `.agent-watch.json` config file:

```json
{
  "version": 1,
  "agentFiles": ["CLAUDE.md", ".github/copilot-instructions.md"],
  "useGitContext": true,
  "hookTrigger": "commit",
  "agents": ["github-copilot-cli"]
}
```

## Git hook integration

agent-watch detects your existing hook manager:

- **Lefthook** - prints the config to add to `lefthook.yml`
- **Husky** - prints the `npx husky add` command to run
- **No hook manager** - installs directly to `.git/hooks/`

The hook is idempotent and can be safely re-run.

## Programmatic API

You can also use agent-watch as a library:

```ts
import { loadConfig, detectAgentFiles, KNOWN_AGENT_FILES } from "agent-watch"

const config = loadConfig("./my-project")
const files = detectAgentFiles("./my-project")
```

## License

MIT
