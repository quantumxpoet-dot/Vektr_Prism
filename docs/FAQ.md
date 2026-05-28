# Vektr Prism — Frequently Asked Questions

---

### Do I need to install anything?
**No** if you download the desktop app. It includes everything — Node.js, the server, the frontend, Playwright. Just download, install, and run.

**Yes** if you run from source — you need Node.js and Chrome.

### Do I need an API key?
**No.** Vektr Prism uses your existing browser sessions. If you're logged into ChatGPT, Claude, or Gemini in Chrome, that's all you need. No keys, no tokens, no billing.

### Does it work with [insert AI chatbot]?
If it has a text input and a response area in a browser, **yes**. Edit `providers.json` to add the CSS selectors. No code changes, no restart.

### Is my code sent to the internet?
Only to the AI chatbot you choose, through your own browser tab. Vektr Prism itself runs 100% locally — no telemetry, no cloud, no external servers.

### Can I use my normal Chrome profile?
The `--user-data-dir` flag creates a separate profile to avoid conflicts. You *can* use your main profile, but if Chrome is already open, the debug port may conflict. Safest to use a separate profile.

### Why does it need Playwright? That's 50MB.
Playwright is the library that lets Node.js control Chrome tabs. It's the engine behind the entire AI bridge. Without it, there's no way to type into ChatGPT or read Claude's responses programmatically. It's the one dependency that can't be removed.

### Can I run Vektr Prism and my normal Chrome at the same time?
**Yes**, as long as your normal Chrome wasn't launched with `--remote-debugging-port`. The debug Chrome is a separate instance with its own profile.

### What happens if the AI chatbot changes its website layout?
The selectors in `providers.json` may break. When that happens:
1. Open the chatbot in Chrome
2. Press `F12` to open DevTools
3. Find the new CSS selectors for the input box and response area
4. Update `providers.json`
5. No restart needed

### Can I edit files outside the project I'm browsing?
**Yes.** The file API accepts any Windows path. Type any folder path in the sidebar. There are no sandboxing restrictions — this is a local tool for local files.

### What's the difference between Manual and Agent mode?
- **Manual**: You write the prompt, you review the response, you click Confirm. One file at a time.
- **Agent**: You describe a goal, the AI plans multiple steps, executes them across multiple files, runs tests, and fixes errors automatically.

### Is Agent mode safe? Will it break my code?
In **Supervised mode** (the default), the agent pauses after every step and waits for your approval. Nothing is written to disk until you click Approve. In **Autonomous mode**, it runs freely — use with caution, or on a Git branch.

### Can I undo changes the agent made?
Vektr Prism doesn't have built-in undo. Use Git:
```powershell
cd C:\your\project
git diff          # see what changed
git checkout .    # undo everything
```

### Does Vektr Prism run in the background?
- **Desktop app**: Yes, it's a normal application. Close the window = app quits.
- **From source**: No. It runs as long as the terminal window is open. Close the window = Vektr Prism stops.

### Can I use Vektr Prism on Mac or Linux?
**Yes.** The desktop app builds for Windows, macOS, and Linux. The source code is cross-platform Node.js, but the batch files (`.bat`) are Windows-only. On Mac/Linux from source, replace `launch.bat` with `node server.js` and adjust the Chrome command for your OS.

### How do I update Vektr Prism?
- **Desktop app**: The auto-updater will notify you when updates are available. Click to update.
- **From source**: Pull the latest code (if using Git), then:
```powershell
npm install
npm run build
```
Or just double-click `install.bat` again.

### Can multiple people use Vektr Prism at the same time?
Not by design. It binds to `localhost` and controls one Chrome instance. It's a single-user local tool.

### What's the mobile companion?
A PWA/mobile app that connects to your desktop Vektr Prism via local WiFi. Your phone becomes a remote control — you can start agents, approve steps, and see results from anywhere on your home network. The desktop does the heavy lifting (Playwright, shell commands), your phone is just the UI.

### How does the mobile companion work?
1. Open Vektr Prism desktop
2. Click the mobile icon
3. Scan QR code with your phone
4. Phone connects via WebSocket over local WiFi
5. Send commands from phone, desktop executes, results stream back

No internet required — it's all local network.
