# Vektr Prism

Browser-native agentic IDE. Code with AI. No API keys. No setup.

**Visit**: https://vektrprism.site

## What Is It?

Vektr Prism is a free, open-source IDE that lets you work with your local code files while leveraging AI chatbots you're already logged into (ChatGPT, Claude, Gemini, etc.). 

- **No backend required** — runs entirely in your browser
- **No API keys** — uses your existing subscriptions (or free tiers)
- **File System Access API** — read/write your local files directly
- **Clipboard bridge** — paste prompts into AI tabs, paste responses back
- **100% client-side** — your code never leaves your machine

## Getting Started

1. Visit **https://vektrprism.site**
2. Click **"Open Folder"** to grant access to a project directory
3. Open a file in the editor
4. Ask AI anything in the chat panel
5. Responses get pasted back into your files

## How It Works

### File Access
Uses the browser's **File System Access API** (Chrome, Edge, Opera). Grant permission once per folder, and Vektr Prism can read/write files directly.

### AI Bridge
All AI prompts are sent via **clipboard**:
1. You ask a question
2. Prompt is copied to your clipboard
3. AI tab opens (or focuses existing tab)
4. You paste the prompt
5. AI responds
6. You copy the response
7. Click "Paste Response" in Vektr Prism

No servers, no keys, no billing — just your browser and your AI session.

## Tech Stack

- **Frontend**: React 19, Vite, Monaco Editor
- **Storage**: IndexedDB (browser)
- **File I/O**: File System Access API
- **Deployment**: Cloudflare Pages (static site)

## Development

```bash
# Install dependencies
npm install

# Start dev server (localhost:3001)
npm run dev

# Build for production
npm run build

# Preview production build
npm npm run preview
```

## Deployment

Vektr Prism is deployed to **Cloudflare Pages** at https://vektrprism.site.

### Deploy Your Own Fork

1. **Clone & push to GitHub**
   ```bash
   git clone https://github.com/yourusername/vektr-prism
   cd vektr-prism
   git push origin main
   ```

2. **Connect to Cloudflare Pages**
   - Go to https://dash.cloudflare.com/
   - Workers & Pages → Create application → Connect to Git
   - Select your fork
   - Build command: `npm run build`
   - Build output: `dist/`
   - Deploy!

3. **Point your domain** (if you have one)
   - Go to your domain registrar
   - Update nameservers to Cloudflare's
   - Or add CNAME record to your Cloudflare domain

## Browser Support

- ✅ **Chrome 86+** — Full support (File System Access API)
- ✅ **Edge 86+** — Full support
- ✅ **Opera 72+** — Full support
- ⚠️ **Safari** — Clipboard mode only (no file system API)
- ⚠️ **Firefox** — Partial support (no File System Access API)

## FAQ

**Q: Do you store my code?**
No. Your code stays on your machine. Vektr Prism is a static site that runs entirely in your browser.

**Q: Do you see my AI prompts?**
No. Prompts go directly from Vektr Prism to your AI chatbot (ChatGPT, Claude, etc.) in your own browser tab. We never see them.

**Q: What if I don't want the clipboard bridge?**
You can add API key support for Gemini, OpenAI, or Anthropic by editing `src/lib/aiBridge.js`. Pull requests welcome!

**Q: Can I use this on Mac/Linux?**
Yes! Vektr Prism works on any OS with a modern browser. File System Access API is supported on Windows, macOS, and Linux in Chrome, Edge, and Opera.

**Q: Is there an offline version?**
Not yet. The app requires internet access to reach your AI chatbot. Local model support is on the roadmap.

## Roadmap

- [ ] Local LLM support (Ollama, LM Studio)
- [ ] Agent mode with multi-file changes
- [ ] API key support for Claude, GPT-4, Gemini
- [ ] Git integration (diff, commit)
- [ ] Collaborative editing
- [ ] VSCode extension

## License

MIT — free to use, modify, and distribute.

## Contributing

Issues, PRs, and ideas welcome. Submit to GitHub.

---

**Made with ❤️ by [Your Name]**

Built in a single session. Deployed to the world.
