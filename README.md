# VektrIDE

A universal AI-powered IDE dashboard. Browse files, edit code with Monaco Editor, and talk to **any** AI chatbot (ChatGPT, Claude, Gemini, Mistral, etc.) — all from one interface.

The Playwright bridge works at the DOM level: if you can chat with it in a browser, VektrIDE can automate it.

## Quick Start

```powershell
# First time only:
install.bat

# Every time:
launch.bat
# Then open http://localhost:3001
```

## How It Works

```
Browser (React + Monaco)  →  Express API (:3001)  →  Playwright CDP  →  Any AI Tab
```

1. Open Chrome with `--remote-debugging-port=9222`
2. Navigate to any AI chatbot
3. Open VektrIDE at `http://localhost:3001`
4. Browse files → Edit → Ask AI → Confirm Change → Saved to disk

## Project Structure

```
VektrIDE/
├── launch.bat          # Double-click to start
├── install.bat         # First-time setup
├── server.js           # Express API + static file server
├── ide-backend.js      # Playwright bridge (provider-agnostic)
├── providers.json      # AI provider config (add your own!)
├── src/
│   ├── main.jsx        # React entry
│   ├── App.jsx         # Root layout + state
│   ├── index.css       # Dark theme design system
│   └── components/
│       ├── Sidebar.jsx      # File explorer
│       ├── Editor.jsx       # Monaco Editor wrapper
│       ├── AskAIBar.jsx     # Prompt input + provider picker
│       └── TerminalPanel.jsx # AI response + Confirm Change
├── dist/               # Production build (auto-generated)
├── package.json
└── vite.config.js
```

## Adding AI Providers

Edit `providers.json` — no code changes needed:

```json
{
  "id": "my-chatbot",
  "name": "My Custom Chatbot",
  "urlPattern": "mychatbot.com",
  "inputSelector": "textarea",
  "submitMethod": "enter",
  "responseSelector": ".response",
  "waitMs": 5000
}
```

## Development Mode

```powershell
npm run dev       # Vite dev server with HMR (port 5173)
npm run server    # Express API (port 3001)
```

## Docs

- [Setup Guide](docs/SETUP.md)
- [Architecture Wiki](docs/WIKI.md)

## License

MIT
