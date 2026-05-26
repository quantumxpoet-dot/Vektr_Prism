/**
 * Vektr Prism — AI Bridge (Clipboard + Optional API)
 *
 * Replaces the Playwright/CDP bridge entirely.
 * Two modes:
 *   1. Clipboard Bridge: copies prompt, opens AI tab, user pastes. Zero API needed.
 *   2. API Key Mode: direct fetch to provider API (optional, for power users).
 *
 * Providers and their state are stored in IndexedDB.
 */

const DB_NAME = 'vektrprism';
const STORE_NAME = 'providers';

// ── Provider URLs ─────────────────────────────────────
const PROVIDER_URLS = {
    chatgpt: 'https://chatgpt.com',
    claude: 'https://claude.ai',
    gemini: 'https://gemini.google.com',
    grok: 'https://grok.com',
    copilot: 'https://copilot.microsoft.com',
    manus: 'https://manus.im',
    perplexity: 'https://perplexity.ai',
    deepseek: 'https://chat.deepseek.com',
    'meta-ai': 'https://meta.ai',
    'gemini-studio': 'https://aistudio.google.com',
    vertex: 'https://console.cloud.google.com',
    notebooklm: 'https://notebooklm.google.com',
};

// ── IndexedDB ─────────────────────────────────────────
function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 2); // v2 adds providers store
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('handles')) {
                db.createObjectStore('handles');
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function dbPut(store, data) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).put(data);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function dbGetAll(store) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readonly');
        const req = tx.objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
}

async function dbDelete(store, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// ── Provider Management ───────────────────────────────

/**
 * Save a provider config: { id, name, mode: 'clipboard'|'api', apiKey? }
 */
export async function saveProvider(provider) {
    await dbPut(STORE_NAME, provider);
}

/**
 * Get all configured providers.
 */
export async function getProviders() {
    return dbGetAll(STORE_NAME);
}

/**
 * Remove a provider.
 */
export async function removeProvider(id) {
    await dbDelete(STORE_NAME, id);
}

// ── Clipboard Bridge ──────────────────────────────────

/**
 * Copy prompt to clipboard and open the provider's chat tab.
 * Returns an object with status info.
 */
export async function clipboardAsk(prompt, providerId) {
    const url = PROVIDER_URLS[providerId];
    if (!url) throw new Error(`Unknown provider: ${providerId}`);

    // Copy prompt to clipboard
    await navigator.clipboard.writeText(prompt);

    // Open AI tab (or focus existing)
    const tab = window.open(url, `vektr_${providerId}`);
    if (tab) tab.focus();

    return {
        mode: 'clipboard',
        providerId,
        message: `Prompt copied! Paste it into ${providerId}, then copy the response and use "Paste Response" below.`,
        url,
    };
}

/**
 * Read the clipboard to get the AI response the user copied.
 */
export async function readClipboardResponse() {
    try {
        const text = await navigator.clipboard.readText();
        return text || '';
    } catch {
        return '';
    }
}

// ── API Key Mode (Optional) ───────────────────────────

/**
 * Direct API call to a provider using the user's API key.
 * Only supports providers with public API endpoints.
 */
export async function apiAsk(prompt, providerId, apiKey) {
    // Minimal implementations for the major free-tier APIs
    switch (providerId) {
        case 'gemini':
        case 'gemini-studio': {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                    }),
                }
            );
            const data = await res.json();
            return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
        }

        // Add more providers here as needed (OpenAI, Anthropic, etc.)
        default:
            throw new Error(`API mode not supported for ${providerId}. Use clipboard mode.`);
    }
}

// ── Unified Ask ───────────────────────────────────────

/**
 * Ask AI — routes to clipboard or API mode based on provider config.
 * @param {string} prompt 
 * @param {string} providerId 
 * @returns {{ mode, message?, response? }}
 */
export async function askAI(prompt, providerId) {
    const providers = await getProviders();
    const config = providers.find(p => p.id === providerId);

    if (config?.mode === 'api' && config?.apiKey) {
        const response = await apiAsk(prompt, providerId, config.apiKey);
        return { mode: 'api', response };
    }

    // Default: clipboard bridge
    return clipboardAsk(prompt, providerId);
}

/**
 * Get the URL for a provider (for onboarding).
 */
export function getProviderUrl(providerId) {
    return PROVIDER_URLS[providerId] || null;
}
