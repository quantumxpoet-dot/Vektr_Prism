# Vektr Prism — Innovation Assessment

## What It Is

Vektr Prism is a browser-native agentic IDE that uses free AI chatbot interfaces as coding agents — with zero API keys, zero installation, and zero ongoing cost.

---

## The Core Innovation

Every existing agentic IDE (Cursor, Copilot, Cline, Windsurf, Aider) is built on one shared assumption:

> **AI is a remote API you call with a key.**

This assumption creates unavoidable friction:
- You need an API key per provider
- You pay per token — rationing prompts as agents get expensive
- You're locked to a curated model list
- New models require SDK updates before you can access them
- You lose access to premium web-UI features (custom GPTs, Gems, memory, artifacts)

**Vektr Prism flips this assumption entirely.**

Instead of calling AI as an API, it turns the browser into the bridge:
- Using the **Clipboard API** to send prompts to any AI tab
- Using **`window.open()`** to navigate between AI providers
- Using the **File System Access API** to read and write local files directly

This makes the AI provider the user's browser session — not a developer's API key.

---

## Why This Matters

### 1. Economic accessibility
The best AI models (GPT-4o, Claude 3.5, Gemini 1.5 Pro) are available free through their web interfaces. Vektr Prism makes these the coding agent — turning a $0/month AI plan into a fully agentic IDE workflow.

### 2. Zero infrastructure
No backend, no server, no database. The app is a ~260KB static bundle on Cloudflare's CDN. Operational cost is effectively zero.

### 3. Full feature access
Users get access to *all* provider features: custom GPTs, Claude Projects, Gemini Gems, memory, web browsing, code execution — features that API-based tools cannot access because they're web-exclusive.

### 4. Privacy by design
Code never leaves the user's machine. No data passes through any intermediary. The IDE has no server to compromise.

### 5. Provider independence
Users can switch between ChatGPT, Claude, Gemini, Grok, DeepSeek, Meta AI, and Perplexity mid-session. No lock-in. No re-configuration.

---

## The Paradigm Shift

| Paradigm | Traditional AI IDE | Vektr Prism |
|----------|--------------------|-------------|
| AI access | API key + per-token billing | Free browser session |
| Models available | Provider's curated list | Any chatbot with a web UI |
| Custom GPTs / Gems | ❌ | ✅ |
| Conversation memory | ❌ (stateless API calls) | ✅ (browser session persists) |
| Installation | Desktop app or VS Code extension | Visit a URL |
| Operational cost | $20–100/month (IDE + AI subscriptions) | $0 |
| Privacy | Code sent to IDE provider servers | Code never leaves the machine |

---

## Honest Limitations

- Requires manual copy/paste between the IDE and AI tabs (vs. fully automated API calls)
- Chrome 86+ required for File System Access API
- Not optimized for mobile
- AI response parsing relies on user correctly copying the response

The clipboard bridge is less seamless than direct API automation. That's the tradeoff for zero cost and zero API keys. A future browser extension could close this gap entirely.

---

## Summary

Vektr Prism reframes the problem from "how do we call AI cheaply?" to "how do we let users use the AI they already have?" The answer — the browser itself as the runtime — removes every barrier between a developer and a capable agentic workflow. No billing. No key management. No install. Just a URL.
