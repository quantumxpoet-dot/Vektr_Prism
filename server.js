/**
 * Vektr Prism — API Server
 * 
 * Express server on port 3001. Provides endpoints for:
 *  - File browsing (Windows paths)
 *  - File reading / writing
 *  - AI prompt relay via the Playwright bridge
 *  - Provider listing
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'ws';
import { IDEBridge } from './ide-backend.js';
import { AgentController } from './agent/AgentController.js';
import { exportForNotebookLM } from './agent/NotebookLMExporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// =============================================
// WEBSOCKET SERVER (Mobile Companion)
// =============================================

const httpServer = createServer(app);
const wss = new Server({ server: httpServer });

let mobileClients = new Set();

wss.on('connection', (ws, req) => {
    console.log('📱 Mobile companion connected');
    mobileClients.add(ws);

    // Send connection confirmation
    ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to Vektr Prism desktop',
    }));

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            handleMobileMessage(ws, message);
        } catch (e) {
            console.error('Invalid message from mobile:', e);
        }
    });

    ws.on('close', () => {
        console.log('📱 Mobile companion disconnected');
        mobileClients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        mobileClients.delete(ws);
    });
});

/**
 * Handle messages from mobile companion
 */
function handleMobileMessage(ws, message) {
    switch (message.type) {
        case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;

        case 'ask-ai':
            handleMobileAskAI(ws, message);
            break;

        case 'agent-start':
            handleMobileAgentStart(ws, message);
            break;

        case 'agent-approve':
            handleMobileAgentApprove(ws);
            break;

        case 'agent-skip':
            handleMobileAgentSkip(ws);
            break;

        case 'agent-abort':
            handleMobileAgentAbort(ws);
            break;

        default:
            console.log('Unknown message type:', message.type);
    }
}

/**
 * Handle AI prompt from mobile
 */
async function handleMobileAskAI(ws, message) {
    const { prompt, provider, filePath } = message;

    try {
        const b = await getBridge();
        if (!b) {
            ws.send(JSON.stringify({
                type: 'error',
                error: 'Desktop not connected to browser',
            }));
            return;
        }

        const response = await b.askAI(provider, prompt, null);

        ws.send(JSON.stringify({
            type: 'ai-response',
            response,
            provider,
            filePath,
        }));
    } catch (e) {
        ws.send(JSON.stringify({
            type: 'error',
            error: e.message,
        }));
    }
}

/**
 * Handle agent start from mobile
 */
async function handleMobileAgentStart(ws, message) {
    const { goal, projectDir, mode, provider } = message;

    try {
        const b = await getBridge();
        if (!b) {
            ws.send(JSON.stringify({
                type: 'error',
                error: 'Desktop not connected to browser',
            }));
            return;
        }

        // Create fresh agent
        agent = new AgentController(b);

        // Wire agent events to mobile client
        agent.on('log', (entry) => {
            ws.send(JSON.stringify({ type: 'agent-log', data: entry }));
        });
        agent.on('state', (data) => {
            ws.send(JSON.stringify({ type: 'agent-state', data }));
        });
        agent.on('plan', (data) => {
            ws.send(JSON.stringify({ type: 'agent-plan', data }));
        });
        agent.on('step-complete', (data) => {
            ws.send(JSON.stringify({ type: 'agent-step-complete', data }));
        });
        agent.on('complete', (data) => {
            ws.send(JSON.stringify({ type: 'agent-complete', data }));
        });
        agent.on('verify-failed', (data) => {
            ws.send(JSON.stringify({ type: 'agent-verify-failed', data }));
        });

        // Start async
        agent.startTask(goal, projectDir, mode || 'supervised', provider || null)
            .catch(e => {
                ws.send(JSON.stringify({ type: 'error', message: e.message }));
            });

        ws.send(JSON.stringify({ type: 'agent-started' }));
    } catch (e) {
        ws.send(JSON.stringify({
            type: 'error',
            error: e.message,
        }));
    }
}

/**
 * Handle agent approve from mobile
 */
async function handleMobileAgentApprove(ws) {
    if (!agent) {
        ws.send(JSON.stringify({ type: 'error', error: 'No active agent' }));
        return;
    }
    await agent.approve();
    ws.send(JSON.stringify({ type: 'agent-approved' }));
}

/**
 * Handle agent skip from mobile
 */
async function handleMobileAgentSkip(ws) {
    if (!agent) {
        ws.send(JSON.stringify({ type: 'error', error: 'No active agent' }));
        return;
    }
    await agent.skip();
    ws.send(JSON.stringify({ type: 'agent-skipped' }));
}

/**
 * Handle agent abort from mobile
 */
function handleMobileAgentAbort(ws) {
    if (!agent) {
        ws.send(JSON.stringify({ type: 'error', error: 'No active agent' }));
        return;
    }
    agent.abort();
    ws.send(JSON.stringify({ type: 'agent-aborted' }));
}

/**
 * Broadcast to all mobile clients
 */
function broadcastToMobile(type, data) {
    const message = JSON.stringify({ type, data });
    for (const client of mobileClients) {
        try {
            client.send(message);
        } catch (e) {
            mobileClients.delete(client);
        }
    }
}

// --- Serve production build if dist/ exists ---
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    console.log('  📦 Serving production build from dist/');
}

// --- Playwright Bridge (lazy init) ---
let bridge = null;

async function getBridge() {
    if (!bridge) {
        bridge = new IDEBridge();
        const ok = await bridge.connect();
        if (!ok) {
            bridge = null;
            return null;
        }
    }
    return bridge;
}

// =============================================
// FILE SYSTEM ENDPOINTS
// =============================================

/**
 * GET /api/files?dir=C:\projects\my-app
 * Lists directory contents with name, type (file/directory), full path, and size.
 */
app.get('/api/files', (req, res) => {
    const dir = req.query.dir;
    if (!dir) return res.status(400).json({ error: 'Missing ?dir= parameter' });

    const resolved = path.resolve(dir);
    try {
        if (!fs.existsSync(resolved)) {
            return res.status(404).json({ error: `Directory not found: ${resolved}` });
        }
        const stat = fs.statSync(resolved);
        if (!stat.isDirectory()) {
            return res.status(400).json({ error: `Not a directory: ${resolved}` });
        }

        const entries = fs.readdirSync(resolved, { withFileTypes: true });
        const items = entries
            .filter(e => !e.name.startsWith('.') && e.name !== 'node_modules')
            .map(entry => {
                const fullPath = path.join(resolved, entry.name);
                const isDir = entry.isDirectory();
                let size = 0;
                try { if (!isDir) size = fs.statSync(fullPath).size; } catch { }
                return {
                    name: entry.name,
                    type: isDir ? 'directory' : 'file',
                    path: fullPath,
                    size,
                };
            })
            .sort((a, b) => {
                // Directories first, then alphabetical
                if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
                return a.name.localeCompare(b.name);
            });

        res.json({ dir: resolved, items });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/resolve-folder?name=my-project
 * Used by the native folder picker button (File System Access API).
 * The browser only returns the folder name, not the full path.
 * We search common locations to find it and return the resolved path.
 */
app.get('/api/resolve-folder', (req, res) => {
    const name = req.query.name;
    if (!name) return res.status(400).json({ error: 'Missing ?name=' });

    const home = process.env.USERPROFILE || process.env.HOME || 'C:\\Users\\User';
    const searchRoots = [
        home,
        path.join(home, 'Desktop'),
        path.join(home, 'Documents'),
        path.join(home, 'Projects'),
        path.join(home, 'source'),
        path.join(home, 'dev'),
        path.join(home, 'repos'),
        'C:\\',
        'C:\\projects',
        'C:\\dev',
        'C:\\repos',
        'C:\\Users',
    ];

    for (const root of searchRoots) {
        const candidate = path.join(root, name);
        try {
            if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
                return res.json({ path: candidate, found: true });
            }
        } catch { /* skip */ }
    }

    // Nothing found — return the name so user can correct it manually
    res.json({ path: name, found: false });
});



/**
 * GET /api/file?path=C:\projects\my-app\index.js
 * Reads a file and returns its content + metadata.
 */
app.get('/api/file', (req, res) => {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: 'Missing ?path= parameter' });

    const resolved = path.resolve(filePath);
    try {
        if (!fs.existsSync(resolved)) {
            return res.status(404).json({ error: `File not found: ${resolved}` });
        }
        const stat = fs.statSync(resolved);
        const content = fs.readFileSync(resolved, 'utf8');
        const ext = path.extname(resolved).replace('.', '');
        res.json({ path: resolved, content, extension: ext, size: content.length, mtime: stat.mtimeMs });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * GET /api/file-mtime?path=C:\...
 * Returns only the last-modified timestamp — used by the file watcher to detect
 * external changes without re-reading the whole file.
 */
app.get('/api/file-mtime', (req, res) => {
    const filePath = req.query.path;
    if (!filePath) return res.status(400).json({ error: 'Missing ?path=' });
    try {
        const stat = fs.statSync(path.resolve(filePath));
        res.json({ mtime: stat.mtimeMs });
    } catch {
        res.json({ mtime: null });
    }
});


/**
 * POST /api/save-file
 * Body: { path: "C:\\...", content: "..." }
 * Writes content to file (creates dirs if needed).
 */
app.post('/api/save-file', (req, res) => {
    const { path: filePath, content } = req.body;
    if (!filePath || content === undefined) {
        return res.status(400).json({ error: 'Missing path or content in body' });
    }

    const resolved = path.resolve(filePath);
    try {
        fs.mkdirSync(path.dirname(resolved), { recursive: true });
        fs.writeFileSync(resolved, content, 'utf8');
        res.json({ ok: true, path: resolved, size: content.length });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// =============================================
// NOTEBOOKLM ONE-CLICK PIPELINE
// =============================================

/**
 * POST /api/notebooklm-push
 * Body: { dir, notebookName? }
 * 1. Exports all project files as flat .txt via NotebookLMExporter
 * 2. Opens NotebookLM in Chrome (already signed in)
 * 3. Creates a new notebook + uploads all files via Playwright setInputFiles()
 * Streams progress as newline-delimited JSON so the UI can show live steps.
 */
app.post('/api/notebooklm-push', async (req, res) => {
    const { dir, notebookName } = req.body;
    if (!dir) return res.status(400).json({ error: 'Missing dir' });

    // Stream progress back as newline-delimited JSON (no SSE overhead)
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');

    const send = (data) => {
        try { res.write(JSON.stringify(data) + '\n'); } catch { }
    };

    try {
        send({ step: 1, total: 7, message: '📦 Exporting project files...' });

        const { exportForNotebookLM } = await import('./agent/NotebookLMExporter.js');
        const result = exportForNotebookLM(dir, { notebookName });

        send({
            step: 2, total: 7,
            message: `✅ Exported ${result.exported} files to notebooklm-export/`,
        });

        const b = await getBridge();
        if (!b) {
            send({ error: 'Chrome not connected. Run launch.bat and try again.' });
            return res.end();
        }

        // Get full paths of the exported .txt files
        const filePaths = result.files.map(f => `${result.outputDir}\\${f}`);

        const title = notebookName || `Vektr Prism — ${dir.split('\\').pop()} — ${new Date().toLocaleDateString()}`;

        await b.uploadToNotebookLM(filePaths, title, (progress) => {
            send({ step: progress.step + 2, total: 7, message: progress.message });
        });

        send({ step: 7, total: 7, message: '🎉 Done! NotebookLM is processing your sources.', done: true });
    } catch (e) {
        send({ error: e.message });
    }

    res.end();
});

// =============================================
// AI BRIDGE ENDPOINTS
// =============================================


/**
 * GET /api/providers
 * Lists configured AI providers from providers.json.
 */
app.get('/api/providers', async (req, res) => {
    const b = await getBridge();
    if (!b) {
        // Still return providers even if bridge isn't connected
        const bridge2 = new IDEBridge();
        return res.json({
            connected: false,
            providers: bridge2.providers.map(p => ({
                id: p.id, name: p.name, notes: p.notes,
            })),
            openTabs: [],
        });
    }
    const openTabs = b.listOpenProviders();
    res.json({
        connected: true,
        providers: b.providers.map(p => ({
            id: p.id, name: p.name, notes: p.notes,
        })),
        openTabs,
    });
});

/**
 * POST /api/ask-ai
 * Body: { prompt, code, provider, filePath }
 * Sends prompt + code to the selected AI provider via Playwright.
 */
app.post('/api/ask-ai', async (req, res) => {
    const { prompt, code, provider, filePath } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });

    const b = await getBridge();
    if (!b) {
        return res.status(503).json({
            error: 'Playwright bridge not connected. Launch Chrome with --remote-debugging-port=9222 first.',
        });
    }

    // Auto-detect provider if not specified
    let providerId = provider;
    if (!providerId) {
        const detected = b.detectProvider();
        if (detected) {
            providerId = detected.providerId;
        } else {
            providerId = 'generic';
        }
    }

    try {
        const response = await b.askAI(providerId, prompt, code || null);
        res.json({
            ok: true,
            provider: providerId,
            response,
            filePath: filePath || null,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * POST /api/reconnect
 * Reconnects the Playwright bridge (e.g. after browser restart).
 */
app.post('/api/reconnect', async (req, res) => {
    if (bridge) {
        await bridge.disconnect();
        bridge = null;
    }
    const b = await getBridge();
    res.json({ connected: !!b });
});

// =============================================
// AGENT ENDPOINTS
// =============================================

let agent = null;
let sseClients = [];

/** Broadcast an event to all SSE clients */
function broadcast(event, data) {
    const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    sseClients = sseClients.filter(res => {
        try { res.write(msg); return true; } catch { return false; }
    });
}

/**
 * GET /api/agent/stream — SSE endpoint for real-time agent updates
 */
app.get('/api/agent/stream', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
    });
    res.write('event: connected\ndata: {}\n\n');
    sseClients.push(res);
    req.on('close', () => {
        sseClients = sseClients.filter(c => c !== res);
    });
});

/**
 * POST /api/agent/start
 * Body: { goal, projectDir, mode: "supervised"|"autonomous", provider }
 */
app.post('/api/agent/start', async (req, res) => {
    const { goal, projectDir, mode, provider } = req.body;
    if (!goal || !projectDir) {
        return res.status(400).json({ error: 'Missing goal or projectDir' });
    }

    const b = await getBridge();
    if (!b) {
        return res.status(503).json({
            error: 'Playwright bridge not connected. Launch Chrome with --remote-debugging-port=9222 first.',
        });
    }

    // Create fresh agent
    agent = new AgentController(b);

    // Wire events to SSE
    agent.on('log', (entry) => broadcast('log', entry));
    agent.on('state', (data) => broadcast('state', data));
    agent.on('plan', (data) => broadcast('plan', data));
    agent.on('step-complete', (data) => broadcast('step-complete', data));
    agent.on('complete', (data) => broadcast('complete', data));
    agent.on('verify-failed', (data) => broadcast('verify-failed', data));

    // Start async (don't await — let it run in background)
    agent.startTask(goal, projectDir, mode || 'supervised', provider || null)
        .catch(e => {
            broadcast('error', { message: e.message });
        });

    res.json({ ok: true, message: 'Agent task started' });
});

/**
 * GET /api/agent/status
 */
app.get('/api/agent/status', (req, res) => {
    if (!agent) return res.json({ state: 'idle' });
    res.json(agent.getStatus());
});

/**
 * POST /api/agent/approve — approve current step (supervised mode)
 */
app.post('/api/agent/approve', async (req, res) => {
    if (!agent) return res.status(400).json({ error: 'No active agent' });
    await agent.approve();
    res.json({ ok: true });
});

/**
 * POST /api/agent/skip — skip current step
 */
app.post('/api/agent/skip', async (req, res) => {
    if (!agent) return res.status(400).json({ error: 'No active agent' });
    await agent.skip();
    res.json({ ok: true });
});

/**
 * POST /api/agent/abort — cancel the running task
 */
app.post('/api/agent/abort', (req, res) => {
    if (!agent) return res.status(400).json({ error: 'No active agent' });
    agent.abort();
    res.json({ ok: true });
});

// =============================================
// V4 FRICTIONLESS ENDPOINTS
// =============================================

/**
 * GET /api/tabs — detect open AI chatbot tabs in the debug Chrome window
 */
app.get('/api/tabs', async (req, res) => {
    const b = await getBridge().catch(() => null);
    if (!b) {
        return res.json({ connected: false, tabs: [], message: 'Chrome not connected. Launch Chrome with --remote-debugging-port=9222.' });
    }
    // Gather all open pages
    const allTabs = [];
    for (const ctx of b.browser.contexts()) {
        for (const page of ctx.pages()) {
            const url = page.url();
            if (!url || url === 'about:blank') continue;
            // Find matching provider
            const matched = b.providers.find(p => p.urlPattern && url.includes(p.urlPattern));
            allTabs.push({
                url,
                title: matched?.name || new URL(url).hostname,
                providerId: matched?.id || 'generic',
                isAI: !!matched,
            });
        }
    }
    res.json({ connected: true, tabs: allTabs });
});

/**
 * POST /api/git/snapshot
 * Body: { projectDir }
 * Commits current state before agent runs (safety net).
 */
app.post('/api/git/snapshot', (req, res) => {
    const { projectDir } = req.body;
    if (!projectDir) return res.status(400).json({ error: 'Missing projectDir' });

    try {
        // Check if git repo
        execSync('git rev-parse --is-inside-work-tree', { cwd: projectDir, stdio: 'ignore' });
    } catch {
        return res.json({ ok: false, message: 'Not a git repository — no snapshot taken.' });
    }

    try {
        execSync('git add -A', { cwd: projectDir });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        execSync(`git commit -m "vektrprism: pre-agent snapshot ${timestamp}" --allow-empty`, { cwd: projectDir });
        const hash = execSync('git rev-parse --short HEAD', { cwd: projectDir }).toString().trim();
        res.json({ ok: true, message: `Snapshot committed: ${hash}`, hash });
    } catch (e) {
        res.json({ ok: false, message: `Git snapshot failed: ${e.message}` });
    }
});

/**
 * POST /api/notebooklm/export
 * Body: { projectDir }
 * Exports all project files as .txt for NotebookLM upload.
 */
app.post('/api/notebooklm/export', (req, res) => {
    const { projectDir } = req.body;
    if (!projectDir) return res.status(400).json({ error: 'Missing projectDir' });
    if (!fs.existsSync(projectDir)) return res.status(400).json({ error: 'Directory not found' });

    try {
        const result = exportForNotebookLM(projectDir);
        res.json({
            ok: true,
            exported: result.exported,
            skipped: result.skipped,
            outputDir: result.outputDir,
            message: `Exported ${result.exported} files to notebooklm-export/. Upload that folder to NotebookLM.`,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

if (fs.existsSync(distPath)) {
    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

// =============================================
// START
// =============================================
httpServer.listen(PORT, () => {
    const mode = fs.existsSync(distPath) ? 'PRODUCTION' : 'DEV (use Vite on :5173)';
    console.log(`\n  ⚡ Vektr Prism — http://localhost:${PORT}  [${mode}]\n`);
    console.log('  Core:');
    console.log('    GET  /api/files              — list directory');
    console.log('    GET  /api/file               — read file');
    console.log('    POST /api/save-file          — write file');
    console.log('    POST /api/ask-ai             — single AI prompt');
    console.log('    GET  /api/providers          — list AI providers');
    console.log('  Agent:');
    console.log('    POST /api/agent/start        — start agentic task');
    console.log('    GET  /api/agent/status       — agent state');
    console.log('    GET  /api/agent/stream       — SSE live updates');
    console.log('    POST /api/agent/approve      — approve step');
    console.log('    POST /api/agent/skip         — skip step');
    console.log('    POST /api/agent/abort        — abort task');
    console.log('  v4 Frictionless:');
    console.log('    GET  /api/tabs               — detect open AI tabs');
    console.log('    POST /api/git/snapshot       — safety commit before agent');
    console.log('    POST /api/notebooklm/export  — export project as .txt files\n');
});
