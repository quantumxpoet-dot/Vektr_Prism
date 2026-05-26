# Vektr Prism

> **A free, agentic IDE powered by the AI chatbots you already use.**  
> No API keys. No subscriptions. No downloads. Just open `vektrprism.site`.

---

## The Problem

Every agentic IDE — Cursor, Copilot, Cline, Windsurf — charges you for AI access. Per-token billing. Monthly subscriptions. API keys you have to manage.

Meanwhile, **the best AI models in the world are free to use** through their own chat interfaces: ChatGPT, Claude, Gemini, Grok, DeepSeek, Meta AI, Perplexity — all have free tiers with frontier models.

**Vektr Prism bridges the gap.** It turns those free chat interfaces into a full agentic coding environment.

---

## How It Works

```
vektrprism.site  →  Your Browser  →  Your AI Chatbot Tabs
       ↕                                      ↕
  File System Access API              Free AI (ChatGPT, Claude, Gemini, etc.)
       ↕
  Your Local Files
```

1. Visit **vektrprism.site** — no install, no download
2. Click **📂 Open Folder** — browser reads your local files directly
3. Pick your AI chatbots during onboarding (multi-select)
4. Code → Ask AI → apply changes → iterate

**Zero cost. Zero setup. Zero API keys.**

---

## Why This Is Different

| Feature | Cursor / Copilot | Vektr Prism |
|---------|-----------------|-------------|
| Cost | $20–40/mo subscription | **Free** |
| AI models | Locked to their list | **Any chatbot with a free tier** |
| API keys | Required | **None needed** |
| Install | Desktop app download | **Just open the website** |
| NotebookLM | ❌ | ✅ Deep codebase understanding |
| Custom GPTs / Gems | ❌ | ✅ Full access |
| Conversation history | ❌ (each call is fresh) | ✅ (browser session persists) |
| Add new AI provider | Wait for update | **You can add any chatbot** |
| Privacy | Code sent to their servers | **Code never leaves your machine** |

---

## Supported AI Providers (All Free Tier)

| Provider | What you get free |
|----------|-------------------|
| **ChatGPT** | GPT-4o, custom GPTs |
| **Claude** | Claude 3.5 Sonnet, Projects |
| **Gemini** | Gemini 1.5 Pro, Gems |
| **Grok** | Grok 2, real-time web |
| **DeepSeek** | R1, V3 — fully free |
| **Meta AI** | Llama 4 — fully free |
| **Copilot** | GPT-4 via Microsoft — free |
| **Perplexity** | AI search + reasoning |
| **NotebookLM** | Codebase-grounded AI — free |
| **Google AI Studio** | Gemini API playground — free |

---

## Features

- **🔮 Browser-native IDE** — Monaco Editor, file explorer, syntax highlighting
- **💬 AI Chat Panel** — prompt history, system context, diff preview
- **🤖 Agent Mode** — PLAN → EXECUTE → VERIFY → ITERATE across files
- **📂 Local File Access** — reads/writes your files via File System Access API
- **📓 NotebookLM Integration** — one-click export for deep codebase analysis
- **⌨️ Keyboard Shortcuts** — Ctrl+Enter (send), Ctrl+K (focus), ↑/↓ (history)
- **🎨 Premium UI** — ambient light design, depth system, glassmorphism

---

## Quick Start

1. Open **[vektrprism.site](https://vektrprism.site)** in Chrome/Edge
2. Select your AI chatbots during onboarding
3. Click **📂 Open Folder** to load your project
4. Start coding with AI

---

## Modes

**⚡ Manual** — Open a file, ask AI anything, review the response, apply changes. Full control.

**🤖 Agent** — Describe a goal. The agent plans multi-file changes, executes them, and iterates on failures. Supervised or autonomous.

---

## Privacy

- Your code **never leaves your machine** — File System Access API is browser-local
- Your AI conversations stay in **your own browser sessions**
- No telemetry, no analytics, no data collection
- Vektr Prism is a static website — there is no backend server

---

## Tech Stack

- **Frontend**: React + Monaco Editor + vanilla CSS
- **File I/O**: File System Access API (Chrome 86+)
- **AI Bridge**: Clipboard + cross-tab communication
- **Hosting**: Cloudflare Pages (static)
- **Persistence**: IndexedDB + localStorage
- **Dependencies**: Zero server-side. Pure browser.

---

## License

MIT
