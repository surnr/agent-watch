# Agent Instructions for agent-watch

## Project Overview

**agent-watch** is a CLI tool that uses git hooks to keep AI agent configuration files in sync with your codebase. It watches for commits or pushes, gathers context from git changes and chat sessions, and automatically updates agent instruction files.

- **Repository**: https://github.com/surnr/agent-watch
- **Package**: `agent-watch` (npm)
- **License**: MIT
- **Node Version**: >=20.0.0

## Tech Stack

- **Language**: TypeScript (ESNext target)
- **Build System**: tsdown + TypeScript compiler
- **Testing**: Vitest with coverage (v8)
- **Linting/Formatting**: Biome (tab indentation, 120 line width, semicolons as needed)
- **Package Manager**: pnpm (v10.8.0)
- **Git Hooks**: Lefthook (for development)
- **CLI Framework**: Commander.js
- **Interactive Prompts**: @inquirer/prompts
- **Publishing**: Changesets for version management

## Project Structure

```
agent-watch/
├── src/
│   ├── cli.ts              # CLI entry point
│   ├── commands/
│   │   └── init.ts         # Interactive init command
│   ├── config.ts           # Configuration management
│   ├── constants.ts        # Known agent files & constants
│   ├── detect.ts           # Agent file detection
│   ├── hooks.ts            # Git hook installation
│   ├── utils/              # Utility modules
│   └── index.ts            # Library exports
├── tests/                  # Test files
├── dist/                   # Compiled output (CJS + ESM)
└── docs/                   # Documentation
```

## Code Conventions

### Style Guide
- **Indentation**: Tabs (configured in Biome)
- **Line Width**: 120 characters
- **Semicolons**: As needed (not required)
- **Trailing Commas**: ES5 style
- **Line Endings**: LF
- **Import Organization**: Enabled (Biome auto-sorts)
- **Strict Mode**: Enabled (TypeScript)

### Naming Conventions
- **Files**: kebab-case (e.g., `detect.ts`, `copilot.ts`)
- **Functions**: camelCase (e.g., `detectAgentFiles`, `loadConfig`)
- **Interfaces**: PascalCase (e.g., `AgentFilePattern`, `GitHookTrigger`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `KNOWN_AGENT_FILES`, `CONFIG_FILE_NAME`)

### TypeScript Patterns
- Use `type` for unions, `interface` for objects that may be extended
- Export types alongside implementations
- Prefer `const` assertions for readonly arrays
- Use ESM imports exclusively (no CommonJS)

### Testing
- Tests colocated with source files (`.test.ts` suffix)
- Vitest for unit testing
- No tests should fail when making changes
- Run `pnpm test` before committing
- **Test Isolation**: When tests modify git configuration or global state, always save and restore original values
  - Example: Save `core.hookspath` before modifying, restore in `afterEach` to prevent parent repo pollution
  - Prevents side effects like unwanted directories (e.g., `--version/_`)

### Git Hooks
- Lefthook configured in `lefthook.yml`
- Pre-commit hooks run linting and type checking
- Hooks are project-managed, not installed via agent-watch itself

## Key Concepts

### Supported Agent Files
The tool manages configuration files for various AI coding assistants:
- `AGENTS.md` - Generic agent instructions (recommended)
- `CLAUDE.md` - Claude Code
- `.github/copilot-instructions.md` - GitHub Copilot
- `.cursor/rules` - Cursor
- `.windsurfrules` - Windsurf
- `.clinerules` - Cline

### Configuration
Project config stored in `.agent-watch.json`:
```json
{
  "version": 1,
  "agentFiles": ["CLAUDE.md", "AGENTS.md"],
  "useGitContext": true,
  "hookTrigger": "commit",
  "agents": ["github-copilot-cli"]
}
```

### Git Hook Integration
Three modes supported:
1. **Lefthook** - Provides config snippet for `lefthook.yml`
2. **Husky** - Provides command to run
3. **Direct** - Installs directly to `.git/hooks/`

## Making Changes

### Adding New Features
1. Create feature branch from `main`
2. Implement changes in `src/`
3. Add tests if applicable
4. Run `pnpm test` to verify
5. Run `pnpm run check:fix` to format
6. Commit with descriptive message
7. Create changeset: `pnpm run changeset`

### Adding New Agent File Support
1. Add entry to `KNOWN_AGENT_FILES` in `src/constants.ts`
2. Update README.md supported files table
3. Test detection with `detectAgentFiles()`
4. Update documentation if needed

### Modifying CLI Commands
- Commands in `src/commands/`
- Register in `src/cli.ts`
- Use `@inquirer/prompts` for interactive flows
- Use `logger` utility for consistent output

## Important Notes

- **Module System**: Pure ESM (no CommonJS in source)
- **Build Output**: Both ESM and CJS for compatibility
- **Node Version**: Minimum Node 20+
- **Git Context**: Tool reads git history, so valid git repo required
- **Idempotency**: Hook installation is idempotent (safe to rerun)
- **No Breaking Changes**: Use changesets for version management

## Resources

- [Commander.js Docs](https://github.com/tj/commander.js)
- [Inquirer Prompts](https://github.com/SBoudrias/Inquirer.js/tree/main/packages/prompts)
- [Biome Documentation](https://biomejs.dev/)
- [tsdown](https://tsdown.netlify.app/)
- [Vitest](https://vitest.dev/)
- [Changesets](https://github.com/changesets/changesets)

## Contact & Contribution

Report issues at: https://github.com/surnr/agent-watch/issues

When contributing:
- Follow existing code style (enforced by Biome)
- Write tests for new functionality
- Update documentation
- Create changeset for version tracking
- Keep PRs focused and atomic