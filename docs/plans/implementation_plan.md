# Vektr Prism — Web-Only Refactor Plan

## Goal
Refactor Vektr Prism from a local Node.js app into a **pure static web app** hosted at `vektrprism.site` on Cloudflare Pages. Zero downloads, zero installs. Visit → use.

---

## Architecture Shift

| Layer | Current (local) | New (web) |
|-------|----------------|-----------|
| **Hosting** | `localhost:3001` | `vektrprism.site` (Cloudflare Pages) |
| **Backend** | Express + server.js | **None** — fully static |
| **File I/O** | Node.js `fs` | **File System Access API** (browser-native) |
| **AI Bridge** | Playwright + CDP | **Clipboard bridge** + optional API keys |
| **Persistence** | localStorage | **IndexedDB** + localStorage |
| **Build** | Vite → dist/ | Vite → dist/ → Cloudflare Pages |
| **Dependencies** | Express, Playwright, cors | **React, Monaco only** |

---

## Proposed Changes

### Phase 1 — Core (File System + AI Bridge)

#### [NEW] `src/lib/fileSystem.js`
- Wrapper around File System Access API (`showDirectoryPicker`, `getFileHandle`)
- Read/write files directly from browser — no server
- Store directory handle in IndexedDB so folder persists across sessions
- Recursive directory tree builder (replaces `/api/files`)

#### [MODIFY] `src/components/Sidebar.jsx`
- Replace `fetch('/api/files')` with `fileSystem.listDir()`
- Replace `fetch('/api/file')` with `fileSystem.readFile()`
- "Open Folder" uses new `fileSystem.openFolder()`

#### [MODIFY] `src/App.jsx`
- Remove all `fetch('/api/...')` calls
- Use `fileSystem` module for all file operations
- Save via `fileSystem.writeFile()` instead of `/api/save-file`

#### [NEW] `src/lib/aiBridge.js`
- **Clipboard bridge**: copies prompt to clipboard, opens provider tab
- **API key mode** (optional): direct fetch to provider APIs
- Provider session management via IndexedDB
- `askAI(prompt, providerId)` → returns response

#### [MODIFY] `src/components/ChatPanel.jsx`
- Replace `fetch('/api/ask-ai')` with `aiBridge.askAI()`
- Show clipboard instructions when in bridge mode
- Show API key input when in direct mode

### Phase 2 — Onboarding & Provider Management

#### [MODIFY] `src/components/OnboardingWizard.jsx`
- Step 1: Welcome
- Step 2: Multi-select provider cards (same grid, already built)
- Step 3: For each selected → open login URL in popup, detect when popup closes
- Step 4: Connected summary → done
- Store selections in IndexedDB

#### [NEW] `src/components/ProviderManager.jsx`
- Settings panel: list connected providers, add/remove anytime
- Toggle between clipboard mode and API key mode per provider
- Re-run auth flow for any provider
- Accessible from TopNav settings gear

### Phase 3 — Cleanup & Deploy

#### [DELETE] `server.js`
#### [DELETE] `launch.bat`
#### [DELETE] `install-context-menu.bat`
#### [DELETE] `ide-backend.js` (Playwright bridge)
#### [DELETE] `agent/AgentController.js` (server-side agent loop)

#### [MODIFY] `package.json`
- Remove: express, cors, playwright
- Keep: react, react-dom, @monaco-editor/react, vite
- Remove pkg config

#### [NEW] `wrangler.toml` or Cloudflare Pages config
- Build command: `npm run build`
- Output directory: `dist/`
- No functions needed (purely static)

---

## What Stays
- All React components (Sidebar, Editor, ChatPanel, AgentPanel, TopNav)
- Monaco Editor
- CSS design system (all 2200+ lines)
- Onboarding wizard (adapts to web flow)
- providers.json (used client-side)
- NotebookLM exporter logic (client-side export, manual upload)

## What Goes
- server.js, ide-backend.js, launch.bat, install scripts
- Playwright dependency
- Express + cors
- CDP connection logic
- pkg build config

---

## Verification Plan
1. `npm run build` succeeds with no server dependencies
2. `npx vite preview` serves full IDE locally
3. File System Access API: open folder, read files, save edits
4. Clipboard bridge: prompt copies, AI tab opens, response pastes back
5. Onboarding: multi-select providers, popup auth, localStorage persistence
6. Deploy to Cloudflare Pages: `vektrprism.site` loads and works
