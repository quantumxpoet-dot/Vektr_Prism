# VektrIDE — Setup Guide

> **No coding experience needed to follow this guide.** Every step is explained.

---

## What You Need (Prerequisites)

### Option A: Download the Desktop App (Recommended)

**Nothing to install.** Just download and run.

- Windows: `.exe` installer (~60-80MB)
- macOS: `.dmg` file
- Linux: `.AppImage` or `.deb`

The desktop app includes everything — Node.js, the server, the frontend, Playwright. One download, double-click, you're running.

### Option B: Run from Source (Advanced)

Before we start, you need **two things** installed on your Windows PC:

#### 1. Node.js (Required)

Node.js is the engine that runs VektrIDE's server.

**How to check if you already have it:**
1. Press `Win + R`, type `cmd`, press Enter
2. Type `node --version` and press Enter
3. If you see a version number like `v22.16.0` → you're good, skip to Step 2
4. If you see an error → install it:

**How to install:**
1. Go to [https://nodejs.org](https://nodejs.org)
2. Click the big green **"LTS"** button (not "Current")
3. Run the downloaded `.msi` file
4. Click Next through the installer (default settings are fine)
5. **Important:** Check the box that says "Add to PATH" if asked
6. Restart your terminal after installing

### 2. Google Chrome or Microsoft Edge (Required)

You probably already have one of these. VektrIDE uses Chrome's developer mode to talk to AI chatbots.

---

## Installation (Desktop App)

### Step 1: Download

Download the installer for your OS from the releases page.

### Step 2: Install

- **Windows**: Run the `.exe`, follow the installer
- **macOS**: Open the `.dmg`, drag to Applications
- **Linux**: Make the `.AppImage` executable, run it

### Step 3: Launch

Double-click the VektrIDE icon. The app opens with the full IDE interface.

---

## Installation (From Source - Advanced)

### Option A: Double-Click Install (Easiest)

1. Open the `C:\VektrIDE` folder in File Explorer
2. Double-click **`install.bat`**
3. Wait for it to finish (takes 1-2 minutes)
4. You'll see "Setup complete!" when done

### Option B: Manual Install (If Option A fails)

1. Press `Win + R`, type `cmd`, press Enter
2. Type these commands one at a time:

```
cd C:\VektrIDE
npm install
npm run build
```

3. Wait for each to finish before typing the next one

### What just happened?
- `npm install` downloaded the libraries VektrIDE needs
- `npm run build` compiled the web interface into a fast, optimized bundle

---

## Starting VektrIDE (From Source)

### Step 1: Launch VektrIDE

Double-click **`launch.bat`** in the VektrIDE folder.

You'll see something like:
```
  ⚡ VektrIDE — http://localhost:3001  [PRODUCTION]
```

**Don't close this window!** VektrIDE runs as long as this window is open.

### Step 2: Open the Interface

Open your web browser (any browser works) and go to:
```
http://localhost:3001
```

You should see the VektrIDE dashboard with a dark theme, a sidebar on the left, and a code editor in the middle.

### Step 3: Connect to an AI Chatbot (Optional — for AI features)

This step is only needed if you want to use the "Ask AI" or "Agent Mode" features.

1. **Open a special Chrome window** by running this command:
   - Press `Win + R`
   - Paste this and press Enter:
   ```
   chrome.exe --remote-debugging-port=9222 --user-data-dir="C:\temp\chrome-debug"
   ```

   > **What does this do?** It opens Chrome in a special "debug mode" that lets VektrIDE read and type into web pages. Your normal Chrome profile is NOT affected.

2. **Navigate to any AI chatbot** in that Chrome window:
   - `https://chatgpt.com`
   - `https://claude.ai`
   - `https://gemini.google.com`
   - `https://chat.mistral.ai`
   - Or any other AI chat website

3. **Log in** to the chatbot as you normally would

4. **Leave that Chrome window open** — VektrIDE talks to it in the background

---

## Using VektrIDE

### Desktop App vs Browser

- **Desktop App**: Opens the IDE directly in a native window. No browser needed.
- **From Source**: Opens in your browser at `http://localhost:3001`

Both have the same features. The desktop app is more convenient.

### Browsing Files

1. In the sidebar, type a folder path like `C:\Users\YourName\projects\my-app`
2. Click the **→** button
3. Click folders to expand them, click files to open them in the editor

### Manual Mode (⚡)

1. Open a file from the sidebar
2. Type a prompt in the text box at the bottom (e.g., "add error handling")
3. Pick an AI provider from the dropdown
4. Click **🚀 Ask AI**
5. The AI's response appears in the terminal panel
6. Click **✅ Confirm Change** to save the response to your file

### Agent Mode (🤖)

1. Click the **🤖 Agent** button in the top-right of the tab bar
2. Type a goal (e.g., "Add JWT authentication with login and register routes")
3. Choose a mode:
   - **⏸️ Supervised**: Pauses after each step for your approval (recommended for beginners)
   - **🚀 Autonomous**: Runs everything automatically
4. Click **▶ Start Agent**
5. Watch the agent plan and execute steps in the live log
6. In supervised mode, click **✅ Approve & Continue** after each step

---

## Troubleshooting

### Installation Problems

#### `'node' is not recognized as an internal or external command`
**Cause:** Node.js isn't installed or isn't in your system PATH.
**Fix:**
1. Download and install Node.js from https://nodejs.org (LTS version)
2. During install, make sure "Add to PATH" is checked
3. **Close and reopen** your terminal/command prompt after installing
4. Try `node --version` again

#### `'npm' is not recognized`
**Same fix as above** — npm comes bundled with Node.js.

#### `npm install` hangs or takes forever
**Cause:** Slow internet or corporate firewall.
**Fix:**
1. Wait — first install can take 3-5 minutes on slow connections
2. If it's stuck for 10+ minutes, press `Ctrl+C` and try again
3. If behind a corporate proxy, ask your IT team for npm proxy settings

#### `npm ERR! code EACCES` or permission errors
**Fix:** Run your terminal as Administrator:
1. Right-click Command Prompt → "Run as administrator"
2. Try the install command again

#### `npm run build` fails
**Cause:** Usually a dependency issue.
**Fix:**
1. Delete the `node_modules` folder and `package-lock.json` file
2. Run `npm install` again
3. Run `npm run build` again

---

### Startup Problems

#### Double-clicking `launch.bat` closes immediately
**Cause:** An error happened too fast to see.
**Fix:**
1. Open Command Prompt (`Win + R` → `cmd`)
2. Type: `cd C:\VektrIDE`
3. Type: `node server.js`
4. Now you'll see the error message

#### `Error: Cannot find module` when starting the server
**Cause:** Dependencies weren't installed.
**Fix:** Run `npm install` in the VektrIDE folder.

#### Port 3001 is already in use
**Cause:** Another app or a previous VektrIDE instance is using port 3001.
**Fix:**
- Option 1: Close the other instance (check your taskbar/system tray)
- Option 2: Use a different port: `set PORT=3002 && node server.js`

---

### AI Connection Problems

#### "Playwright bridge not connected"
**Cause:** Chrome isn't running in debug mode.
**Fix:**
1. Make sure you ran the special Chrome command:
   ```
   chrome.exe --remote-debugging-port=9222 --user-data-dir="C:\temp\chrome-debug"
   ```
2. Make sure that Chrome window is still open
3. Click the "Reconnect" option or restart VektrIDE

#### "No open tab found for provider"
**Cause:** The AI chatbot website isn't open in the special Chrome window.
**Fix:**
1. In the **Chrome window you opened with the special command**, navigate to the chatbot
2. Make sure you're logged in
3. Make sure you selected the correct provider in VektrIDE's dropdown

#### Chrome says "port 9222 is already in use"
**Cause:** A previous debug Chrome session is still running.
**Fix:**
1. Open Task Manager (`Ctrl+Shift+Esc`)
2. End all "Google Chrome" processes
3. Try the Chrome command again

#### AI response is empty or garbled
**Cause:** The DOM selectors in `providers.json` may be outdated (websites change their HTML).
**Fix:**
1. Open `providers.json` in any text editor
2. The chatbot website may have changed its layout
3. Use your browser's Developer Tools (`F12`) to find the correct CSS selectors
4. Update the `inputSelector` and `responseSelector` for that provider
5. No restart needed — the bridge reloads providers on each request

---

### Agent Mode Problems

#### Agent gets stuck on "Planning"
**Cause:** The AI is taking a long time to respond, or the prompt was too complex.
**Fix:**
1. Click **🛑 Abort**
2. Try a simpler, more specific goal
3. Make sure the AI chatbot tab is responsive (not showing an error)

#### Agent writes code to wrong files
**Cause:** The AI response didn't include clear file paths.
**Fix:**
1. Use **Supervised mode** to review each step
2. Click **⏭️ Skip Step** for steps that look wrong
3. Make your goal description more specific about file names

#### Agent runs too many retries
**Cause:** The AI can't fix the error (max 3 retries built in).
**Fix:**
1. The agent will stop and wait for you
2. Switch to Manual mode to fix the issue by hand
3. Then re-run the agent for the remaining work

---

## Ports Reference

| Port | What | When |
|------|------|------|
| **3001** | VektrIDE (your IDE) | Always (when VektrIDE is running) |
| **5173** | Vite dev server | Only during development (`npm run dev`) |
| **9222** | Chrome debug port | Only when using AI features |

---

## Getting Help

- Check the [Architecture Wiki](WIKI.md) for technical details
- Edit `providers.json` to add new AI chatbots — no coding needed
- All settings are in plain text files — nothing is hidden

---

## Mobile Companion

VektrIDE includes a mobile companion that connects to your desktop app via local WiFi:

1. Open VektrIDE on your desktop
2. Click the mobile icon in the top-right
3. Scan the QR code with your phone
4. Your phone becomes a remote control for the desktop agent

The desktop does all the heavy lifting (Playwright, shell commands), your phone is just the UI.
