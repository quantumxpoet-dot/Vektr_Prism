# VektrIDE — Setup Guide

## Prerequisites

| Requirement | Version | Check |
|-------------|---------|-------|
| Node.js | v18+ (v22 LTS recommended) | `node --version` |
| npm | v8+ | `npm --version` |
| Chrome/Edge | Any modern version | — |

## Install

### Option A: Automatic (Recommended)

Double-click **`install.bat`** in the VektrIDE folder. It will:
1. Verify Node.js is installed
2. Run `npm install` (pulls dependencies)
3. Run `npm run build` (creates production bundle in `dist/`)

### Option B: Manual

```powershell
cd C:\VektrIDE
npm install
npm run build
```

## Launch

### Production Mode (Persistent App)

Double-click **`launch.bat`** or run:

```powershell
cd C:\VektrIDE
npm start
```

This starts a single Node.js process on **port 3001** that serves both the API and the built frontend. Open `http://localhost:3001` in any browser.

### Development Mode (Hot Reload)

For active development with live-reload:

```powershell
# Terminal 1: Vite dev server (frontend)
npm run dev

# Terminal 2: Express API (backend)
npm run server
```

Frontend at `:5173`, API at `:3001`. Vite proxies `/api/*` to Express automatically.

## Connecting to AI Chatbots

VektrIDE talks to AI chatbots through your running Chrome browser via Chrome DevTools Protocol (CDP).

### Step 1: Launch Chrome with CDP

```powershell
chrome.exe --remote-debugging-port=9222 --user-data-dir="C:\temp\chrome-debug"
```

> **Note:** You need a separate `--user-data-dir` to avoid conflicts with your normal Chrome profile. You can use any path.

### Step 2: Open an AI Chatbot

In that Chrome window, navigate to any supported chatbot:
- `https://gemini.google.com`
- `https://chatgpt.com`
- `https://claude.ai`
- `https://chat.mistral.ai`
- `https://perplexity.ai`
- Or any other chat UI

### Step 3: Use VektrIDE

1. Open `http://localhost:3001` (or `:5173` in dev mode)
2. Enter a project path in the sidebar (e.g. `C:\projects\my-app`)
3. Click a file to open it in the editor
4. Select the provider from the dropdown
5. Type a prompt → click **Ask AI**
6. Review the response → click **Confirm Change** to save

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `Playwright bridge not connected` | Chrome isn't running with `--remote-debugging-port=9222` |
| `No open tab found for provider` | Open the chatbot's website in the CDP Chrome window |
| `dist/ not found` | Run `npm run build` to create the production bundle |
| Port 3001 in use | Set `PORT=3002 node server.js` or change in `.env` |
| `node` not found | Install Node.js from https://nodejs.org |

## Ports

| Port | Service |
|------|---------|
| 3001 | VektrIDE server (API + frontend) |
| 5173 | Vite dev server (dev mode only) |
| 9222 | Chrome CDP (must be launched by you) |
