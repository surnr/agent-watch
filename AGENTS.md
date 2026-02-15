# Agent Watch: Development Guide

This document provides guidance for AI agents working on the Agent Watch codebase. It includes project structure, code conventions, testing practices, and key architectural patterns.

---

## Project Overview

**Agent Watch** is a CLI tool that automatically extracts knowledge from AI chat sessions (Claude Code, GitHub Copilot Chat, Copilot CLI) and updates agent configuration files (CLAUDE.md, AGENTS.md, .github/copilot-instructions.md) to keep them in sync with evolving codebase conventions.

**Key responsibility:** Keep developer knowledge about project patterns and conventions captured in version-controlled agent instruction files, accessible to all AI tools that assist the team.

---

## Tech Stack & Build

### Technologies
- **Language:** TypeScript (strict mode)
- **Runtime:** Node.js 20+ (ESM)
- **Package Manager:** pnpm 10.8.0
- **Build System:** tsdown (ESM) + tsc (type checking)
- **Formatter/Linter:** Biome 1.9.4 (tabs, line width 120, no semicolons)
- **Testing:** Vitest 3.1.1 with coverage
- **CLI Framework:** Commander 13.1.0
- **Git Hooks:** Lefthook (auto-detected, can fall back to Husky or direct hooks)

### Build & Test Commands

```bash
# Build: transpile TypeScript → ESM/CJS, generate type definitions
pnpm build
# Output: dist/index.js, dist/index.cjs, dist/index.d.ts, dist/cli.js

# Run full CI pipeline (lint + type check + unit tests + publint)
pnpm test:ci

# Run just unit tests (Vitest)
pnpm test:unit

# Run linter
pnpm check

# Fix linting issues
pnpm check:fix

# Type checking
pnpm test:types

# Check for unused exports (knip)
pnpm test:unused

# Export validation (any-type-wrong)
pnpm test:exports
```

**Development workflow:**
```bash
git clone https://github.com/surnr/agent-watch.git
cd agent-watch
pnpm install
pnpm build
pnpm link --global  # Link for testing
```

---

## Code Conventions & Patterns

### Naming & Structure

| Category | Convention | Examples |
|----------|-----------|----------|
| **Files** | kebab-case | `claude-code.ts`, `copilot-cli.ts`, `session-state.ts` |
| **Variables/Functions** | camelCase | `processAllSessions`, `enabledTools`, `summarizeSession` |
| **Types/Interfaces** | PascalCase | `SessionExtractor`, `AgentWatchConfig`, `AgentFilePattern` |
| **Constants** | UPPER_SNAKE_CASE | `SUPPORTED_AI_AGENTS`, `KNOWN_AGENT_FILES`, `CONFIG_FILE_NAME` |

### Directory Structure

```
src/
├── cli.ts                          # Entry point, CLI command setup
├── config.ts                       # Config loading/saving (AgentWatchConfig)
├── constants.ts                    # Exported constants (file patterns, ignored files)
├── detect.ts                       # Detect existing agent files in project
├── hooks.ts                        # Git hook installation/management
├── index.ts                        # Public API exports
├── commands/
│   ├── init.ts                     # Interactive setup wizard
│   └── run.ts                      # Main execution flow (extract → summarize → update)
└── utils/
    ├── copilot.ts                  # Copilot CLI interaction (--yolo mode)
    ├── git.ts                      # Git operations (get diff, changed files)
    ├── debug.ts                    # Debug output saving
    ├── logger.ts                   # Colored console output
    └── sessions/
        ├── index.ts                # Main session processing
        ├── state.ts                # Processed sessions state (sessions.json)
        ├── summarize.ts            # Session → summary via Copilot
        ├── types.ts                # SessionExtractor, Session interfaces
        └── extractors/
            ├── claude-code.ts      # Extract from ~/.claude/projects/
            ├── copilot-chat.ts     # Extract from VS Code workspaceStorage
            └── copilot-cli.ts      # Extract from ~/.copilot/session-state/
```

### File Organization

- **Colocation:** Tests live next to source files using `.test.ts` suffix (e.g., `config.ts` + `config.test.ts`)
- **Exports:** Public API defined in `src/index.ts`, carefully controlled
- **Imports:** Use `.js` extensions in imports (ESM output) for CommonJS interop

### Type Safety & Strictness

- TypeScript strict mode enabled
- All functions typed (no implicit `any`)
- Export types alongside implementations (e.g., `type AgentWatchConfig` exported from `config.ts`)
- Use interfaces for contracts (e.g., `SessionExtractor` interface for all extractors)

### Formatting & Linting

Biome is configured with:
- **Indentation:** Tabs (not spaces)
- **Line width:** 120 characters
- **Semicolons:** Omitted (asNeeded)
- **Imports:** Auto-organized by Biome
- **Lint rules:** All recommended + strict unused variable/import detection

No code comments unless genuinely needed for clarification. Self-documenting code is preferred.

---

## Architecture & Key Patterns

### Session Processing Pipeline

1. **Extract (per tool):** Each extractor implements `SessionExtractor` interface
   - Finds session files in tool-specific directories
   - Parses session format (JSON, markdown, etc.)
   - Returns `Session` objects with `{ id, content, timestamp }`
   - Only returns newest 3 sessions per tool

2. **Deduplicate:** Track processed sessions in `.agent-watch/sessions.json`
   - Prevent reprocessing same sessions
   - Store per-tool processed session IDs
   - Ignore sessions already processed

3. **Summarize:** For each new session, ask Copilot CLI
   - Extract human + AI messages
   - Send to `copilot --yolo`: "What patterns/conventions were discussed?"
   - Capture concise summary of learnings

4. **Collect Context:** Gather git context if `watchFileChanges` enabled
   - Files changed in current commit
   - Commit message
   - Diff statistics

5. **Update (atomic):** Single Copilot request with all context
   - Send all session summaries + git context to `copilot --yolo`
   - Provide paths to all agent files
   - Copilot updates files atomically, maintaining consistency
   - Files are modified but not committed (user reviews + commits)

### Interfaces & Contracts

**SessionExtractor** - Every tool must implement:
```typescript
interface SessionExtractor {
  extractLatestSessions(
    homeDir: string,
    limit: number
  ): Promise<Session[] | null>
}
```

**Session** - Uniform session representation:
```typescript
interface Session {
  id: string
  content: SessionContent
  timestamp: number
}

interface SessionContent {
  userMessages: string[]
  aiResponse: string
}
```

**AgentWatchConfig** - User configuration:
```typescript
interface AgentWatchConfig {
  version: 1
  agentFiles: string[]         // Relative paths to files to manage
  watchFileChanges: boolean    // Include git commit context
  hookTrigger: "commit" | "push"  // When to run
  agents: string[]             // Enabled AI tools
}
```

### Ignored File Patterns

Prevent unnecessary processing when only these files change (defined in `constants.ts`):
- Agent instruction files (AGENTS.md, CLAUDE.md, .github/copilot-instructions.md, etc.)
- Documentation (README.md, CHANGELOG.md, LICENSE, etc.)
- Config files (tsconfig.json, biome.json, prettier, eslint, etc.)
- Lock files (package-lock.json, pnpm-lock.yaml, yarn.lock, etc.)
- CI/CD (.github/workflows, .gitlab-ci.yml, .circleci)
- IDE settings (.vscode, .idea, .DS_Store)

This prevents infinite loops and unnecessary runs on non-code changes.

### Supported AI Tools

| Tool ID | Location | Extractor |
|---------|----------|-----------|
| `claude-code` | `~/.claude/projects/<hash>/` | ClaudeCodeExtractor |
| `github-copilot-chat` | `~/Library/.../workspaceStorage/<hash>/chatSessions/` | CopilotChatExtractor |
| `github-copilot-cli` | `~/.copilot/session-state/` | CopilotCliExtractor |

### Configuration Files

- **`.agent-watch/config.json`** - User configuration (created by `init` command)
- **`.agent-watch/sessions.json`** - Processed session tracking
- **`.agent-watch/debug/`** - Optional debug output (`--debug` flag)

---

## Testing Practices

### Test Structure

- **Framework:** Vitest (drop-in Jest replacement, ES modules native)
- **Assertion library:** Vitest built-in expect
- **Test files:** Collocated with source (e.g., `config.test.ts` next to `config.ts`)
- **Setup:** Temporary directories for filesystem operations

### Test Patterns

```typescript
// Use beforeEach/afterEach for setup/teardown
describe("feature", () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "test-"))
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it("should do something", () => {
    // Test here
  })
})
```

### Coverage

Run with: `pnpm test:cov`
Output saved to `coverage/` directory.

---

## Known Agent Files

Agent Watch can manage these configuration files:

| File | AI Tool | Status |
|------|---------|--------|
| `AGENTS.md` | Generic (all) | ✅ Recommended |
| `CLAUDE.md` | Claude Code | ✅ Supported |
| `.github/copilot-instructions.md` | GitHub Copilot | ✅ Supported |
| `.cursor/rules` | Cursor | ✅ Supported |
| `.windsurfrules` | Windsurf | ✅ Supported |
| `.clinerules` | Cline | ✅ Supported |

---

## Common Tasks

### Adding Support for a New AI Tool

1. Create `src/utils/sessions/extractors/new-tool.ts` implementing `SessionExtractor`
2. Add tool ID constant to `SUPPORTED_AI_AGENTS` in `constants.ts`
3. Register extractor in `EXTRACTORS` map in `src/utils/sessions/index.ts`
4. Add corresponding agent file entry to `KNOWN_AGENT_FILES` in `constants.ts`
5. Write tests alongside implementation
6. Run `pnpm test:ci` to verify

### Modifying Session Processing

Session processing logic is in `src/utils/sessions/`:
- `index.ts` - Main orchestration
- `state.ts` - Session state tracking
- `summarize.ts` - Copilot summarization
- `extractors/*.ts` - Tool-specific extraction

Each extractor is independent; changes to one don't affect others.

### Updating Git Hook Integration

Git hook logic in `src/hooks.ts`:
- Detects Lefthook (reads/writes `lefthook.yml`)
- Falls back to Husky or direct `.git/hooks/post-commit`
- Installs `npx agent-watch run` command

---

## Important Implementation Notes

### ESM/CJS Compatibility

- Build outputs both ESM and CommonJS
- CLI entry: `dist/cli.js` (with shebang)
- Main exports: `dist/index.js` (ESM), `dist/index.cjs` (CommonJS)
- Type definitions: `dist/index.d.ts` (CommonJS types copied to `.d.cts`)
- Always use `.js` extensions in imports for ESM output

### Copilot CLI Integration

- Uses `copilot --yolo` mode (runs command without auth UI)
- Sends entire prompt + file paths in one request
- Atomically updates all agent files together
- Requires Copilot CLI already installed and authenticated

### Error Handling

- Try/catch around file I/O operations
- Graceful fallbacks (e.g., return `null` if config missing)
- Clear error messages logged to console
- Debug mode captures full error context

---

## Development Workflow Tips

1. **Always run `pnpm test:ci` before committing** - ensures all checks pass
2. **Use `pnpm check:fix`** to auto-fix formatting before commit
3. **Link globally during development** - `pnpm link --global` allows testing `agent-watch` command directly
4. **Enable debug mode for troubleshooting** - `agent-watch run --debug` saves all intermediate outputs
5. **Tests should clean up temp files** - use `afterEach` with `rmSync`

---

## Roadmap & Future Work

Features planned but not yet implemented:
- [ ] Support for Cursor, Windsurf, Cline AI tools
- [ ] Customizable summarization prompts
- [ ] Team-wide deduplication (shared processed sessions state)
- [ ] Export/import of agent file versions
- [ ] CI/CD pipeline integration
- [ ] Web dashboard for pattern evolution tracking

---

## References

- **Main README:** See `README.md` for user-facing documentation
- **Package.json:** Build scripts, dependencies, exports config
- **GitHub:** https://github.com/surnr/agent-watch
- **License:** MIT (see LICENSE file)
