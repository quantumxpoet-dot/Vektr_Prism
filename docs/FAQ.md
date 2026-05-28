# VektrIDE — Frequently Asked Questions

---

### Do I need an API key?
**No.** VektrIDE uses your existing browser sessions. If you're logged into ChatGPT, Claude, or Gemini in Chrome, that's all you need. No keys, no tokens, no billing.

### Does it work with [insert AI chatbot]?
If it has a text input and a response area in a browser, **yes**. Edit `providers.json` to add the CSS selectors. No code changes, no restart.

### Is my code sent to the internet?
Only to the AI chatbot you choose, through your own browser tab. VektrIDE itself runs 100% locally — no telemetry, no cloud, no external servers.

### Can I use my normal Chrome profile?
The `--user-data-dir` flag creates a separate profile to avoid conflicts. You *can* use your main profile, but if Chrome is already open, the debug port may conflict. Safest to use a separate profile.

### Why does it need Playwright? That's 50MB.
Playwright is the library that lets Node.js control Chrome tabs. It's the engine behind the entire AI bridge. Without it, there's no way to type into ChatGPT or read Claude's responses programmatically. It's the one dependency that can't be removed.

### Can I run VektrIDE and my normal Chrome at the same time?
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
VektrIDE doesn't have built-in undo. Use Git:
```powershell
cd C:\your\project
git diff          # see what changed
git checkout .    # undo everything
```

### Does VektrIDE run in the background?
No. It runs as long as the terminal window is open. Close the window = VektrIDE stops. There's no system tray icon or background service.

### Can I use VektrIDE on Mac or Linux?
The code is cross-platform Node.js, but the batch files (`.bat`) are Windows-only. On Mac/Linux, replace `launch.bat` with `node server.js` and adjust the Chrome command for your OS.

### How do I update VektrIDE?
Pull the latest code (if using Git), then:
```powershell
npm install
npm run build
```
Or just double-click `install.bat` again.

### Can multiple people use VektrIDE at the same time?
Not by design. It binds to `localhost` and controls one Chrome instance. It's a single-user local tool.

### Where are the logs?
The agent logs appear live in the Agent Panel UI. Server logs print to the terminal window running `node server.js`. There are no log files written to disk.
