# Vektr_IDE — Architecture Wiki

## Overview

Vektr_IDE is a browser-native agentic IDE. The browser stays open with your AI session (history, custom instructions, paid features), and the IDE injects prompts and reads responses via DOM automation. No API keys. No subscriptions. Just your existing browser sessions.

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Top Nav: [🔮 Vektr_IDE] [breadcrumb]    [⚡ Manual][🤖 Agent]   [⚙️D]   │
├──────────────┬────────────────────────────┬──|──┬───────────────────────┤
│              │  [Tab bar]  ⟳ stale banner │  │  │  ⚙️ System Prompt      │
│  File        │                            │drag  │  Provider ▾           │
│  Explorer    │   Monaco Code Editor       │  │  │  ┌─User bubble──────┐  │
│              │   (VS Light theme)         │  │  │  └──────────────────┘  │
│  📁 src      │   JetBrains Mono 13px      │  │  │  ┌─AI bubble────────┐  │
│  📄 App.jsx  │                            │  │  │  │  📋 copy          │  │
│  📄 ...      │                            │  │  │  └──────────────────┘  │
│              │                            │  │  │  [🔍 Diff] [✅ Confirm] │
│  ─────────── │                            │  │  │  ───────────────────── │
│  📁 Recent   │                            │  │  │  📎 include file toggle│
│  ─────────── │                            │  │  │  [🚀 Ask AI]           │
├──────────────┴────────────────────────────┴──|──┴───────────────────────┤
│  Status Bar: path / file type / Vektr_IDE v3                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Focus the prompt input from anywhere |
| `Enter` | Send prompt (in chat input) |
| `Shift+Enter` | New line in prompt |
| `↑ / ↓` | Cycle through prompt history |
| `Ctrl+S` | Confirm + save AI response to file |

---

## Key Design Decisions

### Why Playwright + CDP instead of APIs?

| Factor | API Approach | CDP / Playwright |
|--------|-------------|-----------------|
| Auth | Need API keys per provider | Uses your logged-in browser session |
| Cost | Pay per token | Free (uses your existing subscription) |
| Compatibility | Different SDK per provider | One bridge, any website |
| Context | Starts fresh each call | Keeps conversation history, custom instructions |
| Features | Limited to API capabilities | Access to Gems, custom GPTs, Projects, Artifacts |

### Why Provider-Agnostic?

`providers.json` is a config file, not code. Each provider entry defines:

```json
{
  "id": "chatgpt",
  "urlPattern": "chatgpt.com",         // URL matching for auto-detect
  "inputSelector": "#prompt-textarea", // Where to type
  "submitMethod": "enter",             // How to submit
  "responseSelector": ".markdown",     // Where to read the response
  "waitMs": 6000,                      // Initial wait before polling
  "notes": "..."                       // Human-readable notes
}
```

Adding a new chatbot = adding one JSON object. No code change, no rebuild.

**Auto-detect** loops through all open tabs, matches each tab's URL against `urlPattern`, and selects the first match. Falls back to generic selectors if no pattern matches.

---

## Supported Providers (25+)

### Major Chatbots
ChatGPT, Claude, Gemini, Grok, Microsoft Copilot, Meta AI, DeepSeek

### Specialized
Mistral Le Chat, Perplexity, Phind, You.com

### Agentic Platforms
Manus, Google AI Studio, Poe

### Enterprise Cloud
- **Google Vertex AI Studio** — Gemini Pro/Ultra via GCloud console
- **Google Agent Builder** — RAG agents with grounded codebase access
- **Google Agentspace** — enterprise-grade with Workspace/Drive grounding
- **AWS Bedrock Playground** — Claude, Titan, Llama, Mistral via AWS console
- **Azure AI Foundry** — GPT-4, o1, Mistral via Azure portal

### Document / Knowledge Chat
NotebookLM, ChatPDF

### Open Source / Self-Hosted
HuggingChat, Pi, Cohere Coral, Ollama Web UI, LM Studio

---

## Data Flow: Ask AI

```
1. User types in ChatPanel
   └─→ system prompt + optional file content prepended automatically

2. App.askAI(prompt, providerId) → POST /api/ask-ai

3. IDEBridge
   └─→ Finds matching open tab by urlPattern
   └─→ Types prompt into inputSelector
   └─→ Submits (Enter or click)
   └─→ Polls responseSelector until text stabilizes (2s stable = done)

4. Response returned → AI bubble rendered in ChatPanel

5. User clicks 🔍 Diff → inline +/- preview
   User clicks ✅ Confirm (or Ctrl+S) → POST /api/save-file
   └─→ File written to disk, editor updated, mtime refreshed
```

## Data Flow: File Watcher

```
openFile() → stores file.mtime from /api/file
Every 3s → polls /api/file-mtime
If mtime changes → shows ⟳ stale banner in tab bar
User clicks banner → reloads file fresh from disk
```

---

## File System Security

Server binds to `localhost` only. Key endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/files?dir=` | GET | Directory listing (dirs first, hides dotfiles + node_modules) |
| `/api/file?path=` | GET | File content + mtime |
| `/api/file-mtime?path=` | GET | Lightweight mtime-only poll (used by file watcher) |
| `/api/save-file` | POST | Write file to disk |
| `/api/ask-ai` | POST | Relay prompt to open browser tab |
| `/api/providers` | GET | List configured providers |
| `/api/tabs` | GET | List open Chrome tabs with matched providers |
| `/api/agent/start` | POST | Start agentic loop |
| `/api/agent/stream` | GET | SSE stream of live log events |

---

## Component Map

### Frontend (`src/components/`)
| Component | Responsibility |
|-----------|---------------|
| `TopNav.jsx` | Logo, breadcrumb, Manual/Agent toggle, settings |
| `Sidebar.jsx` | File tree, path input, recent folders (localStorage), expand/collapse |
| `Editor.jsx` | Monaco Editor — VS Light theme, JetBrains Mono, file change detection |
| `ChatPanel.jsx` | Conversation bubbles, system prompt drawer, prompt history, copy, diff, include-file toggle |
| `AgentPanel.jsx` | Goal input, supervised/autonomous mode, plan cards, live SSE log |
| `App.jsx` | State management, drag-resize divider, file watcher polling |

### Agent Engine (`agent/`)
| Module | Responsibility |
|--------|---------------|
| `AgentController.js` | Orchestrates PLAN→EXECUTE→VERIFY→ITERATE loop |
| `ProjectContext.js` | Scans project tree, finds relevant files, builds AI context |
| `CodeExtractor.js` | Parses AI responses, extracts code blocks + file paths |
| `TaskRunner.js` | Runs shell commands (tests, lint, build), captures output |
| `NotebookLMExporter.js` | Exports project to a single NotebookLM-ready text file |
| `prompts.js` | Structured prompt templates |

---

## Agent Architecture

### The Agentic Loop

```
User: "Add authentication to this Express app"
         │
    ┌────▼────┐
    │  PLAN   │  ProjectContext scans project → AI returns numbered steps
    └────┬────┘
         │ (supervised: user approves plan)
    ┌────▼────┐
    │ EXECUTE │  For each step:
    │         │   1. Get relevant files from ProjectContext
    │         │   2. AI generates code blocks
    │         │   3. CodeExtractor parses + writes to disk
    └────┬────┘
         │
    ┌────▼────┐
    │ VERIFY  │  TaskRunner runs tests / lint
    └────┬────┘         │ if fail (max 3 retries)
         │         ┌────▼─────┐
         │         │ ITERATE  │  AI fixes error → retry
         │         └──────────┘
    ┌────▼────┐
    │  DONE   │
    └─────────┘
```

### Supervised vs Autonomous
- **Supervised**: pauses after PLAN (approval) and after each EXECUTE step
- **Autonomous**: runs full loop unattended, pauses only on failure after max retries

### Real-Time Updates (SSE)

| Event | Data |
|-------|------|
| `log` | `{ timestamp, type, message }` |
| `state` | `{ state, step, total }` |
| `plan` | `{ plan: [...steps] }` |
| `step-complete` | `{ stepNumber, filesChanged }` |
| `complete` | full status snapshot |

---

## Extending Vektr_IDE

### Add a Provider
Edit `providers.json`. Inspect the chatbot's DOM for:
- Input: `textarea`, `[contenteditable]`, or `[role="textbox"]`
- Response: `.markdown`, `.prose`, or any stable container

### Change the Port
```powershell
$env:PORT=8080; node server.js
```

### Modify the Design System
All tokens are CSS variables in `src/index.css` under `:root`:
- Colors: `--bg-base`, `--bg-surface`, `--accent`, `--text-primary`
- Shadows: `--shadow-raised`, `--shadow-card`, `--shadow-float`
- Fonts: `--font-ui` (Outfit), `--font-mono` (JetBrains Mono)

### Install Right-Click Context Menu
```
install-context-menu.bat          # Run as Admin — adds "Open in Vektr_IDE" to folder right-clicks
install-context-menu.bat /remove  # Uninstall
```

---

## Persistence Model

Vektr_IDE is a single Node.js process (no daemon, no service):

1. `launch.bat` → opens Chrome with `--remote-debugging-port=9222`
2. `node server.js` → Express on port 3001, serves `dist/` as static files
3. Browser opens `http://localhost:3001`
4. Terminal window IS the server — `Ctrl+C` to stop

**localStorage** persists across sessions:
- `vektr_system_prompt` — project context / system prompt
- `vektr_recent_folders` — last 6 opened project paths
- `vektride_session` — last goal + mode from Agent panel
