# VektrIDE — Workflow Guide

## Quick Start

### Desktop App (Recommended)
```
1. Download and install VektrIDE
2. Double-click to launch
3. Open Chrome with CDP (app prompts you)
4. Open any AI chatbot in Chrome
5. Type a folder path → Enter
6. Open a file
7. Ask AI → Confirm Change
```

### From Source
```
1. Run launch.bat                   # Opens Chrome with CDP enabled
2. Open any AI chatbot in Chrome    # ChatGPT, Claude, Gemini, Manus, etc.
3. node server.js                   # Start API server (port 3001)
4. Open http://localhost:3001       # Open the IDE
5. Type a folder path → Enter       # Load your project
6. Open a file                      # File content is ready for AI context
7. Ask AI → Confirm Change          # Done
```

---

## Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  [🔮 Vektr_IDE]  [filename]    [⚡ Manual][🤖 Agent]   [⚙️ D]   │
├──────────────┬────────────────────────┬──|──┬────────────────────┤
│  Explorer    │  Editor                │drag │  Chat / Agent      │
│              │                        │     │                    │
│  📁 src      │  Monaco (VS Light)     │  ←→ │  [System Prompt⚙] │
│  📄 App.jsx  │  JetBrains Mono        │     │  [Bubbles...]      │
│  📄 ...      │                        │     │  [📎 include file] │
│  ─────────── │                        │     │  [🚀 Ask AI]       │
│  Recent ▾   │                        │     │                    │
├──────────────┴────────────────────────┴─────┴────────────────────┤
│  status bar                                                      │
└──────────────────────────────────────────────────────────────────┘
```

**Resize**: Drag the `|` divider between the editor and chat panel.

---

## Manual Mode Workflow

### 1. Open a Project
- Enter path in the sidebar (e.g. `C:\projects\my-app`) → Enter
- Or click a **Recent** folder (last 6 projects auto-saved)

### 2. Set Project Context (optional, do once)
Click ⚙️ in the chat header → type your stack context:
```
React + TypeScript, functional components, Tailwind CSS.
Always return typed code. Never use 'any'.
```
This is prepended to every prompt silently — set it once and forget.

### 3. Open a file
Click any file in the Explorer. The file content is immediately available for AI context.

### 4. Ask AI
- Type in the prompt input
- Toggle **📎 Include file** if you want file content sent with the prompt (on by default)
- Press `Enter` or click **🚀 Ask AI**

### 5. Review & Confirm
- AI response appears as a bubble
- Click **🔍 Diff** to see a +/- preview of changes
- Click **✅ Confirm** or press `Ctrl+S` to write to disk

### 6. Repeat
- `Ctrl+K` to focus prompt from anywhere
- `↑ / ↓` to cycle through your prompt history

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Send prompt |
| `Shift+Enter` | New line in prompt |
| `↑ / ↓` | Prompt history |
| `Ctrl+K` | Focus prompt input |
| `Ctrl+S` | Confirm & save AI response |

---

## Agent Mode Workflow

Switch to **🤖 Agent** in the top nav.

### 1. Pick your AI tab
Click 🔄 to refresh open Chrome tabs. Select the tab with your AI session.

### 2. Set goal
Use a template chip or type your own:
```
Add JWT authentication with login and register routes
```

### 3. Choose mode
- **Supervised** — pauses after plan + after each step for your approval
- **Autonomous** — runs full loop unattended

### 4. Start
Click **▶ Start Agent**. Watch the live log stream.

### 5. Approve steps (supervised only)
Click **✅ Approve** to continue, **⏭ Skip** to skip a step, or **🛑 Abort** to stop.

### 6. After completion
- **📸 Git Snapshot** — commits current state with an auto message
- **📤 Export to NotebookLM** — bundles your codebase for NotebookLM upload

---

## Provider Selection

Vektr_IDE supports **25+ providers** via `providers.json`. No code change needed to add a new one.

### How Auto-Detect Works
1. VektrIDE reads all open Chrome tabs via CDP
2. Matches each tab's URL against `urlPattern` in `providers.json`
3. First match wins — that tab receives the prompt
4. Falls back to generic CSS selectors if nothing matches

### Provider Categories

| Category | Examples |
|----------|---------|
| Chatbots | ChatGPT, Claude, Gemini, Grok, Copilot, Meta AI, DeepSeek |
| Agentic | **Manus**, Google AI Studio, Poe |
| Enterprise Cloud | Vertex AI Studio, **Agent Builder**, Agentspace, AWS Bedrock, Azure AI Foundry |
| Document Chat | **NotebookLM**, ChatPDF |
| Open Source | HuggingChat, Ollama, LM Studio, Cohere |
| Search | Perplexity, Phind, You.com |

### Adding a Custom Provider
Open `providers.json`, copy any block, and change:
- `urlPattern` → substring of the site's URL
- `inputSelector` → CSS selector for the chat input
- `responseSelector` → CSS selector for the response text

---

## File Watcher

When another process modifies an open file (agent writes, Git pull, external editor):

1. Vektr_IDE polls `/api/file-mtime` every 3 seconds
2. If the timestamp changes, a pulsing ⟳ banner appears in the tab bar
3. Click it to reload the file — no data is lost from the editor

---

## Context Menu (One-Time Setup)

Add "Open in Vektr_IDE" to Windows Explorer right-click:

```cmd
# Run as Administrator
install-context-menu.bat

# To remove
install-context-menu.bat /remove
```

After running, right-click any folder in Explorer → **Open in Vektr_IDE**.

---

## NotebookLM Integration

Use NotebookLM as a deep-understanding backend for your codebase:

1. Click **📤 Export to NotebookLM** in the Agent panel
2. Upload the generated `.txt` file as a Source in NotebookLM
3. Set `notebooklm` as your provider in Vektr_IDE chat
4. Ask architecture questions, get answers grounded in your actual code

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No response from AI | Chrome must be open with your AI tab visible |
| "CDP not connected" | Re-run `launch.bat`, wait for Chrome to open fully |
| Wrong tab selected | Click 🔄 in Agent panel to refresh tab list |
| Provider not detected | Check `providers.json` — `urlPattern` must match the tab URL |
| File not saving | Check server is running (`node server.js`) |
| Build changes not visible | Run `npm run build`, hard-refresh (`Ctrl+Shift+R`) |

---

## Project Structure

```
VektrIDE/
├── src/                    # React frontend
│   ├── App.jsx             # Root: layout, drag-resize, file watcher
│   ├── index.css           # Full design system (CSS vars, components)
│   └── components/
│       ├── TopNav.jsx      # Navigation bar
│       ├── Sidebar.jsx     # File tree + recent folders
│       ├── Editor.jsx      # Monaco editor wrapper
│       ├── ChatPanel.jsx   # Conversation UI (system prompt, diff, history)
│       └── AgentPanel.jsx  # Agentic loop control
├── agent/                  # Server-side agent engine
│   ├── AgentController.js  # Plan→Execute→Verify→Iterate loop
│   ├── ProjectContext.js   # File scanning + AI context builder
│   ├── CodeExtractor.js    # Extract code blocks from AI responses
│   ├── TaskRunner.js       # Shell command runner (tests, lint)
│   ├── NotebookLMExporter.js
│   └── prompts.js          # Structured prompt templates
├── electron/               # Desktop app wrapper
│   ├── main.cjs            # Electron main process
│   └── preload.cjs         # IPC bridge
├── server.js               # Express API server
├── ide-backend.js          # Playwright/CDP bridge to browser tabs
├── providers.json          # 25+ provider configs (no rebuild needed)
├── launch.bat              # Launches Chrome with CDP + server
├── install-context-menu.bat # Windows Explorer right-click installer
└── docs/
    ├── WIKI.md             # Architecture reference
    └── WORKFLOW.md         # This file
```
