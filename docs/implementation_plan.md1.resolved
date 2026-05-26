# VektrIDE — React + Monaco Editor Dashboard with Gemini Integration

A custom "State-Sync" IDE dashboard: React frontend with Monaco Editor, a file explorer sidebar, an "Ask Gemini" button that sends code to a Node.js/Playwright backend, a split-view terminal to display the response, and a "Confirm Change" button to save modified code to disk. Built for Windows file system paths.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  React Frontend (Vite, port 5173)                    │
│  ┌────────┐ ┌────────────────┐ ┌──────────────────┐  │
│  │Sidebar │ │ Monaco Editor  │ │ Terminal Panel   │  │
│  │(Files) │ │                │ │ (Gemini output)  │  │
│  │        │ │                │ │ [Confirm Change] │  │
│  └────────┘ └────────────────┘ └──────────────────┘  │
│                 [Ask Gemini]                          │
└──────────────┬───────────────────────────────────────┘
               │ HTTP (fetch)
┌──────────────▼───────────────────────────────────────┐
│  Express API Server (server.js, port 3001)           │
│  GET  /api/files?dir=C:\projects\my-app              │
│  GET  /api/file?path=C:\projects\my-app\index.js     │
│  POST /api/ask-gemini  { code, prompt, filePath }    │
│  POST /api/save-file   { path, content }             │
└──────────────┬───────────────────────────────────────┘
               │
┌──────────────▼───────────────────────────────────────┐
│  ide-backend.js (Playwright CDP → Gemini browser)    │
└──────────────────────────────────────────────────────┘
```

## Proposed Changes

### Project Scaffold

#### [NEW] [package.json](file:///c:/VektrIDE/package.json)
Vite + React project initialized via `npx create-vite`. Dependencies: `@monaco-editor/react`, `playwright`, `express`, `cors`.

---

### Backend

#### [NEW] [ide-backend.js](file:///c:/VektrIDE/ide-backend.js)
The user's Playwright bridge class (`InnovativeIDEBridge`) — connects to Chrome via CDP on port 9222, finds the Gemini tab, injects prompts, and reads responses.

#### [NEW] [server.js](file:///c:/VektrIDE/server.js)
Express server (port 3001) with four endpoints:
- `GET /api/files` — list directory contents (name, type, path) for the sidebar
- `GET /api/file` — read a file's content for Monaco
- `POST /api/ask-gemini` — relay prompt + code to `ide-backend.js`, return response
- `POST /api/save-file` — write content to a Windows path

---

### Frontend — Components

#### [NEW] [src/App.jsx](file:///c:/VektrIDE/src/App.jsx)
Root layout: 3-column flex — sidebar, editor, terminal panel.

#### [NEW] [src/components/Sidebar.jsx](file:///c:/VektrIDE/src/components/Sidebar.jsx)
Recursive file tree. Clicking a file loads it in the editor. Uses `GET /api/files` and supports folder expand/collapse.

#### [NEW] [src/components/Editor.jsx](file:///c:/VektrIDE/src/components/Editor.jsx)
Monaco Editor via `@monaco-editor/react`. Displays the selected file's content with syntax highlighting.

#### [NEW] [src/components/TerminalPanel.jsx](file:///c:/VektrIDE/src/components/TerminalPanel.jsx)
Split-view panel below/beside the editor. Shows Gemini response text, includes a "Confirm Change" button that calls `POST /api/save-file` and updates the editor.

#### [NEW] [src/components/AskGeminiBar.jsx](file:///c:/VektrIDE/src/components/AskGeminiBar.jsx)
Prompt input + "Ask Gemini" button between editor and terminal. Sends current code + prompt to `POST /api/ask-gemini`.

---

### Styling

#### [NEW] [src/index.css](file:///c:/VektrIDE/src/index.css)
Dark theme design system — deep charcoal background, accent colors, mono font for code, glassmorphism panels, subtle hover animations.

## Verification Plan

### Automated (Dev Server)
1. `cd c:\VektrIDE && npm run dev` — confirm frontend loads at `http://localhost:5173`
2. `node server.js` — confirm API starts on port 3001
3. Open browser to `http://localhost:5173` — verify sidebar, editor, terminal panel render

### Manual (User)
1. **File browsing**: Enter a Windows path like `C:\projects\my-app` in the sidebar root input. Verify folder/file list appears.
2. **File open**: Click a file → verify content loads in Monaco Editor.
3. **Ask Gemini**: Type a prompt, click "Ask Gemini" → verify response appears in terminal panel. *(Requires Chrome open with Gemini tab on port 9222.)*
4. **Confirm Change**: Click "Confirm Change" → verify file is saved to disk.
