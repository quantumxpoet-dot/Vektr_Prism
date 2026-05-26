# VektrIDE — Architecture Wiki

## Overview

VektrIDE is a "State-Sync" IDE — the browser stays open with your AI session (history, custom instructions, etc.), and the IDE injects prompts and reads responses via DOM manipulation. No API keys needed.

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│  React Frontend (localhost:3001 or :5173)        │
│  ┌─────────┐ ┌──────────────┐ ┌───────────────┐ │
│  │ Sidebar  │ │ Monaco Editor│ │ Terminal Panel│ │
│  │ (files)  │ │              │ │ (AI response) │ │
│  └─────────┘ └──────────────┘ └───────────────┘ │
│         [Provider ▾]   [Ask AI]                  │
└───────────────────┬─────────────────────────────┘
                    │ fetch('/api/...')
┌───────────────────▼─────────────────────────────┐
│  Express Server (server.js, port 3001)           │
│  • Static file serving (dist/)                   │
│  • File system API (read, write, list)           │
│  • AI bridge relay                               │
└───────────────────┬─────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────┐
│  IDEBridge (ide-backend.js)                      │
│  • Connects via CDP to Chrome on port 9222       │
│  • Loads providers.json for DOM selectors         │
│  • Finds matching tab by URL pattern              │
│  • Injects prompt → waits for stable response     │
└───────────────────┬─────────────────────────────┘
                    │ Chrome DevTools Protocol
┌───────────────────▼─────────────────────────────┐
│  Chrome Browser                                  │
│  Tab: ChatGPT / Claude / Gemini / Any chatbot    │
└─────────────────────────────────────────────────┘
```

## Key Design Decisions

### Why Playwright + CDP instead of APIs?

| Factor | API Approach | CDP / Playwright |
|--------|-------------|-----------------|
| Auth | Need API keys per provider | Uses your logged-in browser session |
| Cost | Pay per token | Free (uses your existing subscription) |
| Compatibility | Different SDK per provider | One bridge, any website |
| Context | Starts fresh each call | Keeps conversation history |
| Features | Limited to API capabilities | Access to Gems, custom GPTs, artifacts |

### Why Provider-Agnostic?

`providers.json` is a config file, not code. Each provider is defined by:

```json
{
  "id": "chatgpt",
  "urlPattern": "chatgpt.com",       // How to find the tab
  "inputSelector": "#prompt-textarea", // Where to type
  "submitMethod": "enter",            // How to submit
  "responseSelector": ".markdown",    // Where to read the response
  "waitMs": 6000                      // Initial wait before polling
}
```

Adding a new chatbot = adding one JSON object. No rebuild needed.

### Why Express instead of the existing Oracle server?

Oracle's `dashboard_server.py` is a Python security control plane (process management, hosts freezing, ACL locking). VektrIDE needs a Node.js server because the Playwright bridge is JavaScript. Mixing them would mean:
- Two languages bridged by IPC
- Coupled lifecycle (IDE breaks when security tools restart)
- No benefit — zero shared functionality

## Data Flow: Ask AI

```
1. User types prompt in AskAIBar
   └─→ App.askAI()
       └─→ fetch POST /api/ask-ai { prompt, code, provider }

2. Express receives request
   └─→ getBridge() — lazy-connects to Chrome via CDP
   └─→ bridge.askAI(providerId, prompt, code)

3. IDEBridge
   └─→ Finds tab matching provider.urlPattern
   └─→ Clicks input (provider.inputSelector)
   └─→ Types the full prompt
   └─→ Presses Enter (or clicks submit button)
   └─→ Polls response element until text stabilizes (2s stable = done)
   └─→ Returns response text

4. Express returns { ok, provider, response }
   └─→ React sets aiResponse state
   └─→ TerminalPanel renders response

5. User clicks "Confirm Change"
   └─→ fetch POST /api/save-file { path, content: aiResponse }
   └─→ Express writes to disk
   └─→ Editor updates with new content
```

## File System Security

The file API has no authentication — it's a local-only tool. The server binds to `localhost` by default. Key points:

- `GET /api/files` — read-only directory listing
- `GET /api/file` — read-only file content
- `POST /api/save-file` — writes to disk (the only destructive operation)
- Hidden files (`.` prefix) and `node_modules` are filtered from listings

## Component Map

| Component | File | Responsibility |
|-----------|------|---------------|
| `Sidebar` | `src/components/Sidebar.jsx` | File tree, path input, folder expand/collapse |
| `Editor` | `src/components/Editor.jsx` | Monaco Editor wrapper, language detection |
| `AskAIBar` | `src/components/AskAIBar.jsx` | Provider picker, prompt input, submit |
| `TerminalPanel` | `src/components/TerminalPanel.jsx` | Response display, Confirm Change, Clear |
| `App` | `src/App.jsx` | State management, API calls, layout |

## Extending VektrIDE

### Add a Provider
Edit `providers.json`. Inspect the chatbot's DOM to find:
- The text input (look for `textarea`, `[contenteditable]`, or `[role="textbox"]`)
- The response container (look for `.markdown`, `.prose`, or similar)

### Change the Port
```powershell
set PORT=8080 && node server.js
```

### Add New API Endpoints
Add routes to `server.js` between the existing endpoint sections.

### Modify the UI Theme
All design tokens are CSS custom properties in `src/index.css` under `:root`.
