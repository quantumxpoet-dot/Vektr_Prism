# Vektr Prism — FAQ

## General

**What is Vektr Prism?**
A free agentic IDE you use in your browser at vektrprism.site. It connects your code editor to any AI chatbot you already use — ChatGPT, Claude, Gemini, etc. — without API keys.

**Is it really free?**
Yes. Vektr Prism is free. The AI chatbots it works with all have free tiers (ChatGPT, Claude, Gemini, DeepSeek, etc.). You don't pay for Vektr Prism, and you don't need a paid AI subscription.

**Does it work without installing anything?**
Yes. Just open vektrprism.site in Chrome or Edge. No downloads, no Node.js, no app to install.

**Do I need an API key?**
No. Vektr Prism uses your existing browser sessions — the same accounts you already log into on chatgpt.com, claude.ai, etc.

---

## Privacy & Security

**Does my code get sent to Vektr Prism servers?**
No. Vektr Prism has no server. It's a static website. Your files are read directly by your browser using the File System Access API — they never leave your machine.

**Who sees my AI conversations?**
Only you and the AI provider you're using. Vektr Prism doesn't intercept, log, or relay any messages.

**Is my API key stored anywhere?**
There are no API keys required. If you optionally add one for direct API mode, it's stored only in your browser's IndexedDB — never sent to any server.

---

## How It Works

**How does Vektr Prism talk to AI without an API key?**
Through your clipboard. When you ask a question, the prompt is automatically copied to your clipboard and your AI tab opens. You paste it, get the response, copy it, and click "Paste Response" in Vektr Prism. The AI response is now in your IDE.

**How does it read and write my files?**
Using the browser's File System Access API — a native Chrome/Edge feature that lets websites read and write local files with your explicit permission. You click "Allow" once, and Chrome remembers it.

**Do I need to keep Node.js running?**
No. There's no local server. Everything runs inside your browser tab.

**What happens if I close and reopen the browser?**
Your folder and settings are remembered. Chrome may ask you to re-confirm folder access (one click to restore).

---

## Features

**Can I use multiple AI chatbots?**
Yes. Switch providers anytime with the dropdown in the Chat panel. You can have ChatGPT, Claude, and Gemini tabs open simultaneously and pick the right one per task.

**What's Agent Mode?**
Agent Mode breaks a big goal (e.g. "Add authentication") into a numbered step plan, then walks through each step with targeted prompts — one file at a time. You paste the AI's response after each step.

**Can I use custom GPTs or Claude Projects?**
Yes. Since you're using the actual chatbot interfaces, any features they offer are available — custom GPTs, Claude Projects, Gemini Gems, memory, etc.

**Does it work with private/local AI models?**
If the model has a browser chat interface (e.g. a locally running Open WebUI), Vektr Prism can open that URL. However, local-only setups are out of scope for vektrprism.site.

---

## Compatibility

**What browsers are supported?**
Chrome 86+ and Edge 86+ are fully supported. Firefox and Safari don't support the File System Access API and won't work with file reading/writing.

**Does it work on mobile?**
Vektr Prism is designed for desktop use. It's accessible on mobile Chrome but the layout is optimized for laptop/desktop screens.

**Does it work on Mac / Linux?**
Yes. It's a website — any platform running Chrome or Edge works.

---

## Troubleshooting

**The folder picker doesn't open.**
You need Chrome or Edge 86+. Make sure you're not using Firefox or Safari.

**My files disappeared after restarting Chrome.**
Click "Re-connect" in the Explorer panel. Chrome revokes folder access on browser close for security — one click restores it.

**Popups are being blocked.**
Allow popups from vektrprism.site: Chrome → Settings → Privacy → Site Settings → Pop-ups → Allow vektrprism.site.

**Clipboard paste isn't reading the AI's response.**
Make sure you copied the text from your AI tab before clicking "Paste Response." The button reads whatever is currently in your clipboard.
