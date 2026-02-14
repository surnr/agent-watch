# GitHub Copilot CLI - Commands & Usage

GitHub Copilot CLI is a standalone AI-powered coding assistant that runs directly in your terminal. It provides an interactive agent experience for writing code, debugging, running commands, and managing your projects.

## Installation

```bash
# macOS (Homebrew)
brew install gh-copilot

# npm
npm install -g @githubnext/github-copilot-cli
```

Verify installation:

```bash
copilot -v
```

## Authentication

```bash
# Login via OAuth device flow
copilot login

# Login to a GitHub Enterprise Server
copilot login --host https://github.example.com
```

Authentication state is stored in `~/.copilot/config.json`.

## Starting a Session

```bash
# Start interactive mode
copilot

# Start with a prompt
copilot -i "Fix the bug in main.js"

# Non-interactive mode (exits after completion)
copilot -p "Explain this function" --allow-all-tools

# Resume most recent session
copilot --continue

# Resume a specific session
copilot --resume <session-id>

# Resume using session picker
copilot --resume
```

## Model Selection

Use `--model` to select an AI model:

```bash
copilot --model claude-sonnet-4.5
copilot --model gpt-5
```

Available models include: `claude-sonnet-4.5`, `claude-haiku-4.5`, `claude-opus-4.6`, `claude-opus-4.6-fast`, `claude-opus-4.5`, `claude-sonnet-4`, `gemini-3-pro-preview`, `gpt-5.3-codex`, `gpt-5.2-codex`, `gpt-5.2`, `gpt-5.1-codex-max`, `gpt-5.1-codex`, `gpt-5.1`, `gpt-5`, `gpt-5.1-codex-mini`, `gpt-5-mini`, `gpt-4.1`.

You can also change the model mid-session with the `/model` slash command.

## Slash Commands

Slash commands are typed directly within an interactive Copilot CLI session. Type `/` to see all available commands.

### Session Management

| Command | Description |
|---------|-------------|
| `/clear` | Clear session history and context |
| `/exit`, `/quit` | End the session |
| `/session`, `/usage` | Display session metrics and token usage |
| `/context` | Visual overview of token usage |
| `/compact` | Manually compress conversation history |
| `/resume` | Cycle through and resume local/remote sessions |
| `/share [file/gist]` | Export session as markdown or GitHub Gist |

### Navigation & Files

| Command | Description |
|---------|-------------|
| `/cwd`, `/cd` | Display or change working directory |
| `/add-dir <path>` | Add a directory to the allowed access list |
| `/list-dirs` | Show which directories Copilot can access |

### Authentication & Users

| Command | Description |
|---------|-------------|
| `/login` | Authenticate with GitHub |
| `/logout` | Sign out of GitHub |
| `/user` | Switch between GitHub accounts |

### Agents & Tools

| Command | Description |
|---------|-------------|
| `/agent` | Select from available custom agents |
| `/delegate <prompt>` | Push task to Copilot coding agent (creates a PR on GitHub) |
| `/mcp` | Configure MCP server settings |
| `/mcp add` | Add a new MCP server |
| `/reset-allowed-tools` | Clear all external tool permissions |
| `/review` | Analyze code changes without leaving CLI |

### Configuration

| Command | Description |
|---------|-------------|
| `/model` | Select an AI model |
| `/theme [show/set/list]` | Customize terminal appearance |
| `/terminal-setup` | Enable multiline inputs |

### Help & Feedback

| Command | Description |
|---------|-------------|
| `/help` | List all CLI commands and shortcuts |
| `/feedback` | Submit suggestions or bug reports |

## Prompt Prefix Shortcuts

These prefixes modify how your input is processed:

| Prefix | Description | Example |
|--------|-------------|---------|
| `!` | Execute a shell command directly (no AI processing) | `!git status` |
| `&` | Delegate prompt to Copilot coding agent | `&fix the login bug` |
| `@` | Include a file as context | `@src/main.ts explain this` |

## Permissions & Security

### Tool Permissions

When Copilot wants to run tools that modify files or execute commands, it asks for approval:

- **Allow once** - approve for this action only
- **Allow for session** - approve this tool for the rest of the session
- **Reject** - deny and optionally redirect

### CLI Flags for Permissions

```bash
# Allow all permissions (tools, paths, URLs)
copilot --allow-all
copilot --yolo

# Allow specific tool categories
copilot --allow-all-tools
copilot --allow-all-paths
copilot --allow-all-urls

# Allow specific tools
copilot --allow-tool 'shell(git:*)'
copilot --allow-tool 'write'

# Deny specific tools
copilot --deny-tool 'shell(git push)'

# Allow specific URLs/domains
copilot --allow-url github.com

# Deny specific URLs
copilot --deny-url malicious-site.com

# Add accessible directories
copilot --add-dir ~/workspace --add-dir /tmp
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Shift+Tab` | Toggle Plan Mode (collaborative planning before implementation) |
| `Ctrl+T` | Toggle reasoning visibility (show/hide model's thinking process) |

## Custom Instructions

Copilot CLI supports custom instructions via files in your repository:

| File | Scope |
|------|-------|
| `.github/copilot-instructions.md` | Repository-wide instructions |
| `.github/instructions/**/*.instructions.md` | Path-specific instructions |
| `AGENTS.md` | Agent-level instructions |

## Custom Agents

Define custom agents at different levels:

- **User-level**: `~/.copilot/agents/`
- **Repository-level**: `.github/agents/`
- **Organization-level**: configured via org settings

Built-in system agents: `Explore`, `Task`, `Plan`, `Code-review`.

## Configuration

Configuration is stored at `~/.copilot/config.json` (or `$XDG_CONFIG_HOME/copilot/config.json`).

MCP server configuration: `~/.copilot/mcp-config.json`.

### Useful CLI Help Commands

```bash
copilot help              # General help
copilot help config       # Configuration settings
copilot help commands     # Interactive mode commands
copilot help environment  # Environment variables
copilot help logging      # Logging configuration
copilot help permissions  # Tool usage rules
```

## Non-Interactive / Scripting Mode

```bash
# Run a prompt and exit
copilot -p "List all TODO comments in src/" --allow-all-tools

# Silent output (only agent response, no stats)
copilot -p "What does main.ts do?" -s

# Save session to markdown
copilot -p "Fix the tests" --allow-all --share ./session.md

# Save session as GitHub Gist
copilot -p "Review my code" --share-gist
```

## Repository Initialization

```bash
# Initialize Copilot instructions for a repository
copilot init
```

This creates `.github/copilot-instructions.md` and sets up repository-level configuration.

## Plugin Management

```bash
copilot plugin            # Manage plugins and plugin marketplaces
```

## Update

```bash
copilot update            # Download the latest version
```

## Logging

```bash
# Set log level
copilot --log-level debug

# Custom log directory
copilot --log-dir /tmp/copilot-logs
```

Log levels: `none`, `error`, `warning`, `info`, `debug`, `all`, `default`.

Default log directory: `~/.copilot/logs/`.
