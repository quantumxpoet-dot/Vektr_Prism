# Vektr Prism — Workflow Guide

## How Vektr Prism Works

Vektr Prism uses your existing AI chatbot sessions as a coding agent. No API keys, no subscriptions — just your browser.

```
You type a prompt
    → Vektr Prism copies it to your clipboard
    → Your AI tab opens (ChatGPT, Claude, Gemini, etc.)
    → You paste the prompt, get the response, copy it
    → Click "Paste Response"
    → AI response appears in your IDE
```

---

## Getting Started (First Run)

1. **Visit** `vektrprism.site` in Chrome or Edge
2. **Onboarding**: Select which AI chatbots you use — they open in popups for you to sign in
3. **Open Folder**: Click "📂 Open Folder" → browser's native folder picker → grant access
4. **Pick a file** from the Explorer → it opens in Monaco Editor
5. **Ask AI** in the Chat panel

---

## Manual Mode (Day-to-Day Coding)

### Asking AI about code
1. Select a file in Explorer
2. Enable **📎 Include file** toggle (auto-includes file content in prompt)
3. Type your question → press **Enter** or click **Ask AI**
4. Prompt copies to clipboard → your AI tab opens
5. Paste prompt → copy response → click **📥 Paste Response**

### Applying AI changes
- When a response contains code: **✅ Confirm** applies and saves it
- **🔍 Diff** previews the exact changes before saving
- **Ctrl+S** saves the current file at any time
- **Ctrl+K** — focus the prompt input
- **↑/↓** — cycle through prompt history

### System Prompt (Project Context)
- Click **⚙️** in chat header → type your project context
- Example: `"React 19 + TypeScript. Use functional components. Tailwind for styles."`
- Prepended silently to every prompt — AI always knows your stack

---

## Agent Mode (Multi-Step Tasks)

Agent mode breaks big goals into a numbered plan and executes them step by step.

### How it runs
1. **Describe your goal** — e.g. "Add JWT auth with login/register routes"
2. Click **▶ Start Agent**
3. Planning prompt copies → paste into AI → copy the JSON plan → click **📥 Paste Plan**
4. Agent shows the step-by-step plan
5. Click **▶ Execute Step 1** → code prompt copies → paste into AI → copy code → click **📥 Paste Code**
6. Repeat for each step — progress bar tracks completion

### Task templates (quick start)
- 🔐 Add auth
- 🧪 Write tests
- 🛡️ Error handling
- 📄 Add docs
- 🔄 Convert to TypeScript
- ⚡ Optimize performance

---

## Switching AI Providers

- **Chat panel**: Provider dropdown in header — switch anytime mid-conversation
- **Agent panel**: Provider selector at top — affects all prompts in current run
- **Add more**: Open any AI chatbot site you want to use → sign in → it's ready
- Vektr Prism remembers your last used provider across sessions

---

## File Operations

| Action | How |
|--------|-----|
| Open folder | Click "📂 Open Folder" |
| Re-open last folder | Loads automatically on next visit |
| Re-grant access | Click "Re-connect" if Chrome revokes permission |
| Save file | Ctrl+S or "💾 Save" button |
| Apply AI response | "✅ Confirm" button in chat |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Send prompt |
| `Ctrl+K` | Focus prompt input |
| `Ctrl+S` | Save file / confirm change |
| `↑ / ↓` | Navigate prompt history |
| `Shift+Enter` | New line in prompt (no send) |

---

## Tips

- **Include file toggle**: Turn off if you're asking a general question to save prompt space
- **System prompt**: Set it once per project, forget it — AI always has context
- **Prompt history**: Use ↑ to recall and refine your last prompt
- **Multiple AI tabs**: Open ChatGPT, Claude, and Gemini simultaneously — switch providers per question
