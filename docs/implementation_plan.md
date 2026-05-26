# VektrIDE Agentic Engine — Implementation Plan

Evolve VektrIDE from a manual tool (you prompt → you confirm) into an **autonomous agent** that plans, executes, tests, and iterates — all powered by browser-based AI chatbots.

## The Agentic Loop

```
User: "Add JWT authentication to this Express app"
         │
    ┌────▼────┐
    │  PLAN   │  Agent sends project context to AI, gets a step-by-step plan
    └────┬────┘
         │
    ┌────▼────┐
    │ EXECUTE │  For each step:
    │         │   1. Gather relevant files
    │         │   2. Prompt AI with context + instruction
    │         │   3. Extract code from response
    │         │   4. Apply changes to files
    └────┬────┘
         │
    ┌────▼────┐
    │ VERIFY  │  Run tests/lint, capture output
    └────┬────┘
         │
    ┌────▼─────┐
    │ ITERATE  │  If errors → send errors back to AI → fix → re-verify
    │          │  Max N retries, then escalate to user
    └────┬─────┘
         │
    ┌────▼────┐
    │ REPORT  │  Show summary of what changed + test results
    └─────────┘
```

> [!IMPORTANT]
> **Safety**: The agent never auto-applies without the user's approval mode setting. Two modes:
> - **Supervised** (default): Pauses after PLAN for approval, pauses after each EXECUTE step
> - **Autonomous**: Runs the full loop, only stops on failure or completion

## Proposed Changes

### Agent Core Modules (server-side)

---

#### [NEW] [ProjectContext.js](file:///c:/VektrIDE/agent/ProjectContext.js)

Scans the project directory and builds a structured map:
- Recursive file tree (respects `.gitignore`, skips `node_modules`)
- File metadata (extension, size, last modified)
- `getRelevantFiles(task)` — heuristic to pick files likely relevant to a task (by keyword matching filenames/content)
- `readFiles(paths)` — batch-read file contents for context injection
- `getSummary()` — compact project overview string for AI prompts

---

#### [NEW] [CodeExtractor.js](file:///c:/VektrIDE/agent/CodeExtractor.js)

Parses AI chatbot responses (raw text) to extract structured output:
- Extracts fenced code blocks (``` ... ```) with language tags
- Detects file paths mentioned before code blocks (e.g., "Here's `auth.js`:")
- Returns `{ filePath, language, code }[]`
- Handles multi-file responses (AI returns changes to several files)
- Falls back to treating full response as code if no fences found

---

#### [NEW] [TaskRunner.js](file:///c:/VektrIDE/agent/TaskRunner.js)

Executes shell commands and captures output:
- `run(command, cwd, timeoutMs)` — runs a command, returns `{ exitCode, stdout, stderr }`
- Built-in presets: `runTests()`, `runLint()`, `runBuild()`
- Auto-detects test runner from `package.json` (`jest`, `vitest`, `mocha`, `pytest`)
- Streams output to the agent log in real-time

---

#### [NEW] [AgentController.js](file:///c:/VektrIDE/agent/AgentController.js)

The orchestrator. Manages the full agentic loop:
- `startTask(goal, projectDir, mode)` — entry point
- **PLAN phase**: Sends project summary + goal to AI, parses response into subtask list
- **EXECUTE phase**: For each subtask, gathers context files, prompts AI, extracts code, applies to disk
- **VERIFY phase**: Runs tests/lint, checks exit codes
- **ITERATE phase**: If verification fails, sends errors back to AI with the failing code, up to N retries
- Emits events: `step`, `waiting`, `error`, `complete` (for live UI updates via SSE)
- Tracks full history: every prompt sent, every response received, every file changed

---

#### [NEW] [prompts.js](file:///c:/VektrIDE/agent/prompts.js)

Structured prompt templates:
- `planPrompt(projectSummary, goal)` — asks AI to break a goal into numbered steps
- `executePrompt(step, relevantFiles, context)` — asks AI to implement a specific step
- `fixPrompt(code, error, testOutput)` — asks AI to fix code given an error
- All prompts end with: *"Respond with ONLY the code. Format each file as: `filepath` followed by a fenced code block."*

---

### API Changes

#### [MODIFY] [server.js](file:///c:/VektrIDE/server.js)

Add agent endpoints:
- `POST /api/agent/start` — `{ goal, projectDir, mode: "supervised"|"autonomous" }`
- `GET /api/agent/status` — current state, step log, pending approval
- `POST /api/agent/approve` — approve the current pending step (supervised mode)
- `POST /api/agent/abort` — cancel the running task
- `GET /api/agent/stream` — SSE endpoint for real-time step updates

---

### Frontend Changes

#### [NEW] [src/components/AgentPanel.jsx](file:///c:/VektrIDE/src/components/AgentPanel.jsx)

Replaces or augments the terminal panel when in agent mode:
- Goal input (text area for the high-level task)
- Mode toggle: Supervised / Autonomous
- Live step log (scrolling list of completed/active/pending steps)
- Each step shows: status icon, description, files changed, time taken
- "Approve" / "Skip" / "Abort" buttons for supervised mode
- Expandable detail view per step (prompt sent, AI response, diff)

#### [MODIFY] [src/App.jsx](file:///c:/VektrIDE/src/App.jsx)

- Add agent mode state + toggle
- Wire up SSE connection for live step updates
- Show AgentPanel when agent mode is active

## Verification Plan

### Automated
1. Agent plans a task → verify plan is a parseable step list
2. Agent executes a single step → verify file is created/modified on disk
3. Agent runs tests → verify output is captured
4. Agent iterates on failure → verify retry sends error context

### Manual (User)
1. Open VektrIDE, enter a project path, type a goal, click "Start Agent"
2. Watch the step log populate in real-time
3. In supervised mode, approve/reject individual steps
4. Verify files on disk match expectations
