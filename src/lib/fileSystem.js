/**
 * Vektr Prism — File System Access API Wrapper
 *
 * Replaces the Express /api/files, /api/file, /api/save-file endpoints.
 * Uses the browser's native File System Access API (Chrome 86+).
 * Persists directory handles in IndexedDB so folders survive refresh.
 */

const DB_NAME = 'vektrprism';
const STORE_NAME = 'handles';

// ── IndexedDB helpers ─────────────────────────────────
function openDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function storeHandle(key, handle) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(handle, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getHandle(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
}

// ── Permission check ──────────────────────────────────
async function verifyPermission(handle, readWrite = false) {
    const mode = readWrite ? 'readwrite' : 'read';
    if ((await handle.queryPermission({ mode })) === 'granted') return true;
    if ((await handle.requestPermission({ mode })) === 'granted') return true;
    return false;
}

// ── Public API ────────────────────────────────────────

/**
 * Open a folder via the native picker.
 * Returns { handle, name } and persists the handle in IndexedDB.
 */
export async function openFolder() {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    await storeHandle('lastFolder', handle);
    return { handle, name: handle.name };
}

/**
 * Restore the last-opened folder from IndexedDB.
 * Returns null if no folder was previously opened or permission denied.
 */
export async function restoreFolder() {
    const handle = await getHandle('lastFolder');
    if (!handle) return null;
    const ok = await verifyPermission(handle, true);
    if (!ok) return null;
    return { handle, name: handle.name };
}

/**
 * Build a recursive directory tree from a directory handle.
 * Returns an array of { name, path, type: 'file'|'directory', size?, children? }
 */
export async function listDir(dirHandle, parentPath = '') {
    const items = [];
    const SKIP = new Set(['node_modules', '.git', 'dist', 'build', '__pycache__', '.next', 'coverage']);

    for await (const [name, entryHandle] of dirHandle.entries()) {
        if (name.startsWith('.') && name !== '.env') continue;
        if (SKIP.has(name)) continue;

        const entryPath = parentPath ? `${parentPath}/${name}` : name;

        if (entryHandle.kind === 'directory') {
            items.push({
                name,
                path: entryPath,
                type: 'directory',
                handle: entryHandle,
            });
        } else {
            let size = 0;
            try {
                const file = await entryHandle.getFile();
                size = file.size;
            } catch { /* skip unreadable */ }
            items.push({
                name,
                path: entryPath,
                type: 'file',
                size,
                handle: entryHandle,
            });
        }
    }

    // Sort: directories first, then alphabetical
    items.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    return items;
}

/**
 * Read a file's text content from its handle.
 * Returns { content, name, extension, size, lastModified }
 */
export async function readFile(fileHandle) {
    const file = await fileHandle.getFile();
    const content = await file.text();
    const ext = file.name.split('.').pop().toLowerCase();
    return {
        content,
        name: file.name,
        extension: ext,
        size: file.size,
        lastModified: file.lastModified,
    };
}

/**
 * Write text content to a file handle.
 */
export async function writeFile(fileHandle, content) {
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
}

/**
 * Resolve a file handle from a path relative to the root directory handle.
 * e.g. resolveFile(rootHandle, 'src/App.jsx')
 */
export async function resolveFile(rootHandle, relativePath) {
    const parts = relativePath.split('/');
    let current = rootHandle;

    for (let i = 0; i < parts.length - 1; i++) {
        current = await current.getDirectoryHandle(parts[i]);
    }

    return current.getFileHandle(parts[parts.length - 1]);
}

/**
 * Check if File System Access API is supported.
 */
export function isSupported() {
    return 'showDirectoryPicker' in window;
}
