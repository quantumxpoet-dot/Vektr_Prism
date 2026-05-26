/**
 * VektrIDE — API Server
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
import { fileURLToPath } from 'url';
import { IDEBridge } from './ide-backend.js';
import { AgentController } from './agent/AgentController.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

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
        const content = fs.readFileSync(resolved, 'utf8');
        const ext = path.extname(resolved).replace('.', '');
        res.json({ path: resolved, content, extension: ext, size: content.length });
    } catch (e) {
        res.status(500).json({ error: e.message });
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
// SPA FALLBACK (production mode)
// =============================================
if (fs.existsSync(distPath)) {
    app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}

// =============================================
// START
// =============================================
app.listen(PORT, () => {
    const mode = fs.existsSync(distPath) ? 'PRODUCTION' : 'DEV (use Vite on :5173)';
    console.log(`\n  ⚡ VektrIDE — http://localhost:${PORT}  [${mode}]\n`);
    console.log('  API Endpoints:');
    console.log('    GET  /api/files          — list directory');
    console.log('    GET  /api/file           — read file');
    console.log('    POST /api/save-file      — write file');
    console.log('    POST /api/ask-ai         — single AI prompt');
    console.log('    GET  /api/providers      — list AI providers');
    console.log('    POST /api/agent/start    — start agentic task');
    console.log('    GET  /api/agent/status   — agent state');
    console.log('    GET  /api/agent/stream   — SSE live updates');
    console.log('    POST /api/agent/approve  — approve step');
    console.log('    POST /api/agent/skip     — skip step');
    console.log('    POST /api/agent/abort    — abort task\n');
});
