# Vektr Prism — Architecture Wiki

## Overview

Vektr Prism is a **browser-native agentic IDE** hosted at `vektrprism.site`. It is a pure static web application — no server, no backend, no installation required.

```
vektrprism.site (Cloudflare Pages CDN)
        │
   User's Browser
        ├── File System Access API  → reads/writes local files
        ├── Clipboard API           → sends prompts to AI, receives responses
        ├── window.open()           → opens AI chat tabs
        └── IndexedDB / localStorage → persists state
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 19 |
| Code Editor | Monaco Editor |
| Styling | Vanilla CSS (design tokens, glassmorphism) |
| File I/O | File System Access API (Chrome 86+) |
| AI Bridge | Clipboard API + `window.open()` |
| Persistence | IndexedDB + localStorage |
| Hosting | Cloudflare Pages (static) |
| Build | Vite |
| Dependencies | React, Monaco only — zero server deps |

---

## Core Modules

### `src/lib/fileSystem.js`
Wrapper around the browser's File System Access API.

- `openFolder()` — `showDirectoryPicker()`, persists handle to IndexedDB
- `restoreFolder()` — restores handle from IndexedDB on page load, re-requests permission
- `listDir(handle, path)` — recursive directory tree (skips `node_modules`, `.git`, `dist`)
- `readFile(handle)` — returns `{ content, name, extension, size, lastModified }`
- `writeFile(handle, content)` — saves edits directly to disk, no server

### `src/lib/aiBridge.js`
The clipboard-based AI communication layer.

- `clipboardAsk(prompt, providerId)` — copies prompt to clipboard, opens AI tab via `window.open()`
- `readClipboardResponse()` — reads clipboard text (user's copied AI response)
- `askAI(prompt, providerId)` — routes to clipboard or API key mode
- `saveProvider(config)` — IndexedDB storage for provider configuration
- Provider URLs defined as a static map — no network call needed

---

## Component Architecture

```
App.jsx
├── OnboardingWizard.jsx   First-run: multi-select providers, popup auth
├── TopNav.jsx             Branding, mode toggle (Manual/Agent)
├── Sidebar.jsx            File explorer using fileSystem.js
├── Editor.jsx             Monaco (desktop) / textarea (mobile)
├── ChatPanel.jsx          Chat interface, clipboard bridge, Paste Response
└── AgentPanel.jsx         Multi-step clipboard agent (Plan → Execute)
```

---

## AI Bridge — How It Works

**No API keys. No server. Your browser sessions = your credentials.**

### Clipboard Bridge (default)
1. User types prompt → clicks "Ask AI"
2. Prompt is auto-copied to clipboard (`navigator.clipboard.writeText`)
3. AI tab opens/focuses (`window.open(url, 'vektr_chatgpt', ...)`)
4. User pastes into AI, gets response, copies response
5. User clicks **"Paste Response"** → clipboard is read → response appears in IDE

### Agent Mode (multi-step)
1. User describes goal → "Start Agent"
2. Agent builds planning prompt → copies to clipboard → opens AI tab
3. User pastes → AI returns JSON step plan → user copies → clicks "Paste Plan"
4. Agent walks through each step with a targeted code prompt per file
5. User pastes code per step → applies to their files

---

## File Persistence

Folder handles are stored in `IndexedDB` (key: `lastFolder`). On page load, `restoreFolder()` calls `handle.requestPermission()` — Chrome prompts the user with a small permission dialog (one click). After that, the folder is accessible again without re-picking.

---

## Onboarding Flow

1. Welcome screen
2. Multi-select provider cards (ChatGPT, Claude, Gemini, Grok, DeepSeek, etc.)
3. For each selected provider: `window.open(url, ...)` popup — user signs in
4. Popup close detected via `setInterval(popup.closed)` → marks as connected
5. Completion screen → localStorage flag set → wizard never shows again

---

## Deployment

- **Host**: Cloudflare Pages (`vektrprism.site`)
- **Build**: `npm run build` → outputs `dist/`
- **Config**: `wrangler.toml` — build command + Node 22
- **No server**: Cloudflare serves pure static files from CDN
- **Zero backend costs**: Cloudflare Pages free tier is sufficient

---

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome 86+ | ✅ Full |
| Edge 86+ | ✅ Full |
| Firefox | ⚠️ File System Access API not supported |
| Safari | ⚠️ Partial |
| Mobile Chrome | ⚠️ Works, not optimized |

> Chrome is required for the File System Access API and reliable clipboard access.
