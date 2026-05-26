# Vektr Prism — Task Checklist

## Phase 1 — Core Web Architecture
- [ ] Create `src/lib/fileSystem.js` (File System Access API wrapper)
  - [ ] `openFolder()` — showDirectoryPicker + recursive tree
  - [ ] `readFile(handle)` — read file content
  - [ ] `writeFile(handle, content)` — save edits
  - [ ] `persistHandle()` — IndexedDB for folder persistence
- [ ] Create `src/lib/aiBridge.js` (clipboard + API key bridge)
  - [ ] `askAI(prompt, providerId)` — clipboard copy + tab focus
  - [ ] API key storage (IndexedDB encrypted)
  - [ ] Provider session management
- [ ] Refactor `Sidebar.jsx` — use fileSystem.js instead of /api/files
- [ ] Refactor `App.jsx` — remove all fetch('/api/...') calls
- [ ] Refactor `ChatPanel.jsx` — use aiBridge instead of /api/ask-ai
- [ ] Refactor `Editor.jsx` — save via fileSystem.writeFile()

## Phase 2 — Onboarding & Providers
- [ ] Update `OnboardingWizard.jsx` — popup auth flow (no CDP)
- [ ] Create `ProviderManager.jsx` — add/remove/toggle providers
- [ ] Wire ProviderManager into TopNav settings
- [ ] IndexedDB for provider selections and sessions

## Phase 3 — Cleanup & Deploy
- [ ] Delete: `server.js`, `launch.bat`, `install-context-menu.bat`
- [ ] Delete: `ide-backend.js`, `agent/AgentController.js`
- [ ] Update `package.json` — remove express, playwright, cors, pkg
- [ ] Verify `npm run build` is clean with zero server deps
- [ ] Configure Cloudflare Pages deployment
- [ ] Deploy to `vektrprism.site`
- [ ] Test end-to-end on live site

## Phase 4 — Polish
- [ ] Custom favicon / app icon
- [ ] Update WIKI.md and README.md
- [ ] PWA manifest (install as desktop app from browser)
- [ ] Dark mode toggle
