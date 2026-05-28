# VektrIDE

> **The AI IDE that works with the AI you already pay for.**  
> No API keys. No switching tools. No per-token billing.

> *"A 9/10 innovation — not for advancing model architecture, but for eliminating the economic and infrastructure barriers that prevent most developers from accessing frontier AI development tools."*  
> — [Full Innovation Assessment →](docs/INNOVATION.md)

---

## The Problem With Every Other Agentic IDE

Cursor, GitHub Copilot, Cline, Aider, Continue — they all share one fundamental assumption: **the AI is a remote API you call with a key.**

That assumption has consequences:

| The Current Paradigm | What It Costs You |
|---------------------|------------------|
| API key per provider | Locked to 1-2 models based on price |
| Per-token billing | You ration prompts. Agents get expensive fast. |
| API-only features | No custom GPTs, no Gems, no NotebookLM, no artifacts |
| Fresh context per call | No conversation history, no system prompts |
| Closed model list | New model ships? Wait for SDK update. |

**VektrIDE flips the assumption.**

---

## The VektrIDE Approach: Browser-Native AI

VektrIDE connects to any AI chatbot running in your browser using Chrome DevTools Protocol. No API. No key. No billing.

```
Your Browser Tab (ChatGPT / Claude / Gemini / NotebookLM / Grok / anything)
        ↕  Chrome DevTools Protocol (local, zero latency)
   VektrIDE Agent (plans, executes, verifies, iterates)
        ↕  File System API (read/write any local file)
   Your Codebase
```

This means:

- **Use any model** — if it has a chat interface, it works
- **Zero marginal cost** — use your existing subscription as much as you want
- **Full feature access** — custom GPTs, Gems, NotebookLM notebooks, memory, artifacts
- **Persistent context** — conversation history stays across agent steps
- **One config file** — add any new chatbot in 5 lines of JSON, no code change

---

## What Makes This Genuinely Different

### NotebookLM Integration (Free, Semantic Understanding)

Upload your codebase to Google NotebookLM. It builds a **semantic knowledge base** from every file. When the agent asks "how does auth work in this project?" — NotebookLM *actually knows*, because it read everything. This is code intelligence that paid agentic IDEs don't offer at any price tier.

### AST-Aware Context (v3)

The agent doesn't dump raw file text into prompts. It parses your code structure — functions, classes, imports, call graphs — and sends a semantic map. The AI sees what your code *does*, not just what it *says*.

### Dependency-Aware Execution (v3)

Before modifying a file, the agent scans the dependency graph to find every file that imports it. Those files are automatically included in the AI's context. No more "fixed auth.js but broke the 4 routes that import it."

### Causal Error Reasoning (v3)

When tests fail, the agent doesn't just retry the same prompt. It diffs the exact change that was made, traces the stack to the specific modified line, and builds a surgical fix prompt. This is the difference between "fix this error" and "you changed line 47 from `export function` to `export const` and that's why the named import broke."

---

## Feature Comparison

| Feature | Cursor / Copilot / Cline | VektrIDE |
|---------|--------------------------|---------|
| AI models | Locked to their list | **Any chat UI, any model** |
| Cost | Per-token API billing | **Your existing subscription** |
| NotebookLM | ❌ | ✅ **Free, full semantic understanding** |
| Custom GPTs / Gems | ❌ | ✅ |
| Conversation history | ❌ (each call is fresh) | ✅ (browser session persists) |
| Add new model | Wait for SDK update | **Edit one JSON file** |
| Local/private models | Some | ✅ (anything with a web UI) |
| AST-aware context | Some | ✅ (v3) |
| Dependency graph | Some | ✅ (v3) |
| Causal error tracing | ❌ | ✅ (v3) |

---

## Quick Start

```powershell
# First time only
install.bat

# Every time — opens your browser automatically
launch.bat
```

For AI features, open Chrome in debug mode:
```powershell
chrome.exe --remote-debugging-port=9222 --user-data-dir="C:\temp\chrome-debug"
```
Navigate to any AI chatbot. VektrIDE finds it automatically.

---

## Modes

**⚡ Manual** — Open file → prompt → review → confirm. Full control, one file at a time.

**🤖 Agent** — Type a goal. The agent plans steps, executes them across multiple files, runs tests, and iterates on failures. Supervised (you approve each step) or Autonomous (runs to completion).

---

## Docs

- 📖 [Setup Guide](docs/SETUP.md) — Step-by-step install + troubleshooting
- 🔄 [Workflow Guide](docs/WORKFLOW.md) — What to expect when using VektrIDE
- 🏗️ [Architecture Wiki](docs/WIKI.md) — How it works under the hood
- ❓ [FAQ](docs/FAQ.md) — Common questions answered
- 💡 [Innovation Assessment](docs/INNOVATION.md) — Why this is a genuine paradigm shift (9/10)

---

## Project Structure

```
VektrIDE/
├── launch.bat / install.bat     # Launch (opens browser automatically)
├── server.js                    # Express API + static server
├── ide-backend.js               # Universal Playwright bridge
├── providers.json               # Provider config (any chat UI)
├── agent/
│   ├── AgentController.js       # Orchestrator (PLAN→EXECUTE→VERIFY→ITERATE)
│   ├── ProjectContext.js        # Project scanner + context builder
│   ├── ASTContext.js            # Code structure parser (v3)
│   ├── DependencyGraph.js       # Import graph + impact radius (v3)
│   ├── ErrorAnalyzer.js         # Causal error tracer (v3)
│   ├── CodeExtractor.js         # AI response parser
│   ├── TaskRunner.js            # Shell command executor
│   └── prompts.js               # Structured prompt templates
├── src/                         # React frontend (Monaco Editor)
└── dist/                        # Production build
```

## License

MIT
