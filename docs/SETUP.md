# Vektr Prism — Setup Guide

## Requirements

- **Chrome or Edge** (version 86 or newer)
- A free account on any supported AI chatbot (ChatGPT, Claude, Gemini, etc.)
- That's it.

No Node.js. No installation. No downloads.

---

## Getting Started

### 1. Open Vektr Prism
Visit **[vektrprism.site](https://vektrprism.site)** in Chrome or Edge.

### 2. Complete Onboarding
On first visit, the onboarding wizard will guide you through:
- **Select your AI chatbots** — choose from ChatGPT, Claude, Gemini, Grok, DeepSeek, and more
- **Sign in** — each selected chatbot opens in a popup window. Sign in, then close the popup. Vektr Prism detects it automatically.

You only do this once. Your selections are remembered.

### 3. Open Your Project
Click **📂 Open Folder** in the Explorer panel. Chrome will show a native folder picker. Select your project folder and click **Allow** when asked for permission.

Your folder loads immediately — files are read directly by your browser, nothing is uploaded anywhere.

### 4. Start Coding
- Pick any file in the Explorer
- Ask AI in the Chat panel
- Your prompt auto-copies to clipboard → paste in your AI tab → copy response → click **Paste Response**

---

## Folder Permission

Chrome may occasionally ask you to re-confirm access to your folder (usually after restarting the browser). When this happens, click **Re-connect** in the Explorer panel — it takes one click to restore access.

To make this less frequent, enable persistent storage in Chrome:
```
chrome://settings/content/protectedContent → Allow
```

---

## Supported AI Providers (All Free Tier)

| Provider | URL | Free Tier |
|----------|-----|-----------|
| ChatGPT | chatgpt.com | GPT-4o |
| Claude | claude.ai | Claude 3.5 Sonnet |
| Gemini | gemini.google.com | Gemini 1.5 Pro |
| Grok | grok.com | Grok 2 |
| Copilot | copilot.microsoft.com | GPT-4 |
| DeepSeek | chat.deepseek.com | R1, V3 |
| Meta AI | meta.ai | Llama 4 |
| Perplexity | perplexity.ai | Search + AI |
| NotebookLM | notebooklm.google.com | Codebase grounding |
| AI Studio | aistudio.google.com | Gemini API |

---

## Troubleshooting

### "Open Folder doesn't work"
- Make sure you're using Chrome or Edge 86+
- Firefox and Safari do not support the File System Access API

### "My folder disappeared after restart"
- Click **Re-connect** in the Explorer panel
- Chrome revokes folder access for security on browser restart

### "Clipboard paste isn't working"
- Make sure you've copied the AI's response before clicking "Paste Response"
- Chrome requires the page to be focused — click anywhere on Vektr Prism first

### "AI tab isn't opening"
- Check that your browser allows popups from vektrprism.site
- Chrome → Settings → Privacy → Site Settings → Pop-ups → Allow vektrprism.site

### "Popup was blocked during onboarding"
- Click the **Open ↗** button next to each provider to open it manually
- Sign in, close the tab, then click "Continue" in the wizard

---

## Privacy

- **Your code never leaves your machine.** Files are read/written by the browser directly.
- **Your AI conversations stay in your own browser sessions.** We have no server receiving them.
- **Vektr Prism has no backend.** It's a static website on Cloudflare's CDN.
- We collect no telemetry, no analytics, no data.
