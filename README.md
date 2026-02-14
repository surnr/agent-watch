# agent-watch

CLI tool for keeping AI agent configuration files in sync with your codebase.

## What it does

`agent-watch` automatically updates your AI agent configuration files (like `CLAUDE.md`, `copilot-instructions.md`, `AGENTS.md`, etc.) based on your git activity and chat sessions.

## Supported agent files

- `CLAUDE.md` (Claude Code)
- `.github/copilot-instructions.md` (GitHub Copilot)
- `copilot-instructions.md` (GitHub Copilot)
- `AGENTS.md` / `agents.md` (Generic)
- `.cursorrules` / `.cursor/rules` (Cursor)
- `.windsurfrules` (Windsurf)
- `.clinerules` (Cline)

## Installation

```bash
npm install -g agent-watch
```

Or use directly with npx:

```bash
npx agent-watch init
```

## Usage

### Initialize

Run the interactive setup in your project:

```bash
agent-watch init
```

This will:

1. Detect existing agent configuration files in your project
2. Ask which files you want agent-watch to manage
3. Configure git context usage (commit messages and chat sessions)
4. Set up git hooks (post-commit or pre-push)
5. Choose which AI agent integrations to enable

Configuration is saved to `.agent-watch.json` in your project root.

## Development

```bash
pnpm install
pnpm run build
pnpm run test
```

### Scripts

- `pnpm run build` - Build the package
- `pnpm run test` - Run the full test suite
- `pnpm run test:unit` - Run unit tests
- `pnpm run check` - Lint and format with Biome
- `pnpm run check:fix` - Auto-fix lint and format issues

## License

MIT
