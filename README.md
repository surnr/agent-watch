# Agent Watch

**Keep your AI agents in sync with your evolving codebase—automatically.**

Agent Watch is a CLI tool that captures knowledge from your development workflow—git commits, code changes, and AI chat sessions—and intelligently updates your AI agent configuration files. Stop manually copying patterns from chat sessions. Stop forgetting to update CLAUDE.md or Copilot instructions. Let agent-watch learn from your work and keep your AI agents informed.

## Why Agent Watch?

### The Problem
You're having productive conversations with Claude Code, GitHub Copilot, and other AI assistants. They help you establish patterns, conventions, and best practices. But this knowledge stays trapped in chat history. Your agent configuration files (CLAUDE.md, copilot-instructions.md, etc.) become outdated within days.

**Result:** Your AI assistants keep making the same mistakes. They forget your team's conventions. You waste time repeating yourself.

### The Solution
Agent Watch automatically:
- ✅ **Extracts patterns** from your Claude Code, Copilot Chat, and Copilot CLI sessions
- ✅ **Summarizes learnings** using AI to distill actionable conventions
- ✅ **Updates all agent files** in one atomic operation via git hooks
- ✅ **Deduplicates intelligently** to never reprocess the same sessions
- ✅ **Maintains consistency** across all your AI agent configuration files

### Business Value
- 🚀 **Faster onboarding**: New team members get AI assistants that know your codebase conventions from day one
- 🎯 **Consistent code quality**: AI agents follow your established patterns automatically
- ⏱️ **Time savings**: Stop manually updating agent files or repeating yourself in chat
- 📈 **Knowledge retention**: Capture architectural decisions and patterns from every conversation
- 🤝 **Team alignment**: Share learnings across the team through version-controlled agent files

---

## Quick Start

### 1. Install

**Global installation** (recommended):
```bash
npm install -g agent-watch
```

**Or as a dev dependency** (for team consistency):
```bash
npm install -D agent-watch
# or
pnpm add -D agent-watch
```

**Or run directly** without installation:
```bash
npx agent-watch init
```

### 2. Initialize in Your Project

```bash
cd your-project
agent-watch init
```

The interactive setup wizard will:
1. **Detect existing agent files** (CLAUDE.md, copilot-instructions.md, etc.)
2. **Let you select which files to manage** (space to toggle, enter to confirm)
3. **Ask about git context** - include commit messages and file changes?
4. **Ask about chat sessions** - extract patterns from AI conversations?
5. **Let you choose AI tools** - Claude Code, Copilot Chat, Copilot CLI?
6. **Pick when to run** - after `git commit` or before `git push`?
7. **Install the git hook** automatically

Your configuration is saved to `.agent-watch/config.json`.

### 3. Start Coding Normally

That's it! Now whenever you commit code:

```bash
git add .
git commit -m "feat: add user authentication"
# agent-watch runs automatically
# ✅ Extracts latest 3 sessions from each AI tool
# ✅ Generates summaries of patterns discussed
# ✅ Updates CLAUDE.md, copilot-instructions.md, etc.
```

---

## How It Works

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ 1. GIT COMMIT TRIGGERED                                     │
│    User commits code → git hook activates agent-watch       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. EXTRACT LATEST SESSIONS (3 per tool)                     │
│    ├─ Claude Code: ~/.claude/projects/<hash>/               │
│    ├─ Copilot Chat: ~/Library/.../workspaceStorage/         │
│    └─ Copilot CLI: ~/.copilot/session-state/                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. SUMMARIZE PATTERNS (via GitHub Copilot CLI)              │
│    For each session:                                        │
│    • Extract human messages + AI's final response           │
│    • Ask Copilot: "What patterns/rules were discussed?"     │
│    • Get concise summary of conventions                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. COLLECT GIT CONTEXT                                      │
│    • Files changed in commit                                │
│    • Commit message                                         │
│    • Diff statistics                                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. SINGLE ATOMIC UPDATE (copilot --yolo)                    │
│    Send one prompt with:                                    │
│    • All session summaries                                  │
│    • Git context                                            │
│    • Paths to all agent files                               │
│                                                             │
│    Copilot reads and updates all files together,            │
│    maintaining consistency across CLAUDE.md,                │
│    copilot-instructions.md, AGENTS.md, etc.                 │
└─────────────────────────────────────────────────────────────┘
```

### Smart Deduplication

Agent Watch tracks which sessions have been processed **per tool**:

```json
{
  "processedSessions": {
    "claude-code": ["session-1", "session-2"],
    "github-copilot-chat": ["chat-1", "chat-2"],
    "github-copilot-cli": ["cli-1", "cli-2"]
  }
}
```

**You'll never waste time reprocessing the same conversations.**

### Smart Filtering

Agent Watch automatically **skips analysis** when only these files change:
- Documentation (README.md, CHANGELOG.md, etc.)
- Config files (.gitignore, tsconfig.json, etc.)
- Lock files (package-lock.json, pnpm-lock.yaml, etc.)
- Agent files themselves (CLAUDE.md, copilot-instructions.md, etc.)

**Your workflow stays fast.**

---

## Supported AI Tools

| AI Tool                 | What Gets Extracted            | Where Sessions Are Stored                             |
| ----------------------- | ------------------------------ | ----------------------------------------------------- |
| **Claude Code**         | Conversations from CLI and IDE | `~/.claude/projects/<hash>/`                          |
| **GitHub Copilot Chat** | Chat sessions in VS Code       | `~/Library/.../workspaceStorage/<hash>/chatSessions/` |
| **GitHub Copilot CLI**  | Terminal chat sessions         | `~/.copilot/session-state/`                           |

**More tools coming:** Cursor, Windsurf, Cline support is on the roadmap.

---

## Supported Agent Files

Agent Watch can manage these configuration files:

| File                              | AI Tool             |
| --------------------------------- | ------------------- |
| `CLAUDE.md`                       | Claude Code         |
| `.github/copilot-instructions.md` | GitHub Copilot      |
| `AGENTS.md` / `agents.md`         | Generic (all tools) |
| `.cursorrules` / `.cursor/rules`  | Cursor              |
| `.windsurfrules`                  | Windsurf            |
| `.clinerules`                     | Cline               |

**You choose which files to manage during setup.**

---

## Configuration

After running `agent-watch init`, your config is stored in `.agent-watch/config.json`:

```json
{
  "version": 1,
  "agentFiles": ["CLAUDE.md", ".github/copilot-instructions.md"],
  "watchFileChanges": true,
  "includeChatSession": true,
  "hookTrigger": "commit",
  "agents": ["claude-code", "github-copilot-chat", "github-copilot-cli"]
}
```

### Configuration Options

| Option               | Type                 | Description                             |
| -------------------- | -------------------- | --------------------------------------- |
| `agentFiles`         | `string[]`           | Which agent files to update             |
| `watchFileChanges`   | `boolean`            | Include git commit context              |
| `includeChatSession` | `boolean`            | Extract and summarize chat sessions     |
| `hookTrigger`        | `"commit" \| "push"` | When to run agent-watch                 |
| `agents`             | `string[]`           | Which AI tools to extract sessions from |

---

## Advanced Usage

### Debug Mode

See what agent-watch is doing under the hood:

```bash
agent-watch run --debug
```

This creates `.agent-watch/debug/` with:
- Raw session extractions
- Generated summaries
- Final prompt sent to Copilot
- Copilot's response

**Useful for troubleshooting or understanding how summaries are generated.**

### Manual Run

Trigger agent-watch without committing:

```bash
agent-watch run
```

### Git Hook Integration

Agent Watch automatically detects and integrates with:

**Lefthook** - Adds to `lefthook.yml`:
```yaml
post-commit:
  commands:
    agent-watch:
      run: npx agent-watch run
```

**Husky** - Creates hook:
```bash
npx husky add .husky/post-commit "npx agent-watch run"
```

**Direct** - Installs to `.git/hooks/post-commit` if no hook manager detected.

---

## Real-World Example

### Before Agent Watch

You're building a React app. Over several days, you have these conversations with Claude Code:

1. **Monday**: Establish that all API calls should use React Query
2. **Tuesday**: Decide to use Zod for validation schemas
3. **Wednesday**: Create a pattern for error boundaries
4. **Thursday**: New team member asks Claude to fetch data with `fetch()` (Claude suggests it because CLAUDE.md is outdated)

**Problem:** Your conventions are lost in chat history. New code violates established patterns.

### After Agent Watch

Every time you commit:

1. **Monday commit**: CLAUDE.md updated with "Use React Query for all API calls"
2. **Tuesday commit**: CLAUDE.md updated with "Validate with Zod schemas"
3. **Wednesday commit**: CLAUDE.md updated with error boundary pattern
4. **Thursday**: New team member's Claude Code already knows to use React Query (reads CLAUDE.md)

**Result:** Consistency maintained automatically. Knowledge compounds.

---

## FAQ

**Q: Does this require GitHub Copilot subscription?**
A: Yes, for the summarization feature. Agent Watch uses `copilot --yolo` to intelligently update agent files. However, session extraction works independently.

**Q: Will this commit the updated agent files automatically?**
A: No. Agent Watch updates the files, but you'll see them as unstaged changes. Review and commit them when ready.

**Q: What if I don't want to extract from all tools?**
A: During `agent-watch init`, select only the tools you want. You can also edit `.agent-watch/config.json` later.

**Q: Can I use this with a monorepo?**
A: Yes! Run `agent-watch init` in each package that has its own agent files.

**Q: What about privacy? Are my chat sessions sent anywhere?**
A: No external services. Everything runs locally. Sessions are summarized via your local Copilot CLI installation.

**Q: Can I customize the summarization prompt?**
A: Not currently, but this is on the roadmap. Open an issue if you need this feature.

---

## Roadmap

- [ ] Support for more AI tools (Cursor, Windsurf, Cline)
- [ ] Customizable summarization prompts
- [ ] Team-wide deduplication (shared processed sessions state)
- [ ] Export/import of agent file versions
- [ ] Integration with CI/CD pipelines
- [ ] Web dashboard for visualizing pattern evolution

---

## Contributing

We welcome contributions! To get started:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Add tests if applicable
5. Run tests: `pnpm test:ci`
6. Submit a pull request

### Development Setup

```bash
git clone https://github.com/surnr/agent-watch.git
cd agent-watch
pnpm install
pnpm build
pnpm link --global
```

Now you can test your changes with `agent-watch` commands.

---

## Troubleshooting

**Issue: "No agent files configured"**
**Solution:** Run `agent-watch init` to set up configuration.

**Issue: "copilot: command not found"**
**Solution:** Install GitHub Copilot CLI: `npm install -g @githubnext/github-copilot-cli`

**Issue: Sessions not being extracted**
**Solution:**
1. Check that you have chat sessions in the expected locations
2. Run `agent-watch run --debug` to see what's happening
3. Verify your tool selections in `.agent-watch/config.json`

**Issue: Agent files not updating**
**Solution:**
1. Ensure Copilot CLI is authenticated: `copilot auth`
2. Check `.agent-watch/debug/` logs if debug mode is enabled
3. Verify agent file paths in config are correct

---

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

## Support

- 🐛 **Bug reports:** [GitHub Issues](https://github.com/surnr/agent-watch/issues)
- 💡 **Feature requests:** [GitHub Discussions](https://github.com/surnr/agent-watch/discussions)
- 📖 **Documentation:** Check the [docs](./docs) folder
- ⭐ **Star us on GitHub** if you find this useful!

---

**Built with ❤️ for developers who believe AI assistants should remember your conversations.**
