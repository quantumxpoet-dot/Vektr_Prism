import { useState, useCallback } from 'react';

const RECENT_KEY = 'vektr_recent_folders';
const MAX_RECENT = 6;

const API = '/api';

function getRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); }
    catch { return []; }
}
function saveRecent(path) {
    const list = [path, ...getRecent().filter(p => p !== path)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
}

export default function Sidebar({ currentDir, onDirChange, onFileSelect, activeFile }) {
    const [items, setItems] = useState([]);
    const [expanded, setExpanded] = useState({});
    const [childItems, setChildItems] = useState({});
    const [pathInput, setPathInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [recent, setRecent] = useState(getRecent);

    const fetchDir = useCallback(async (dir) => {
        try {
            setLoading(true);
            const res = await fetch(`${API}/files?dir=${encodeURIComponent(dir)}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            return data.items || [];
        } catch (e) {
            console.error('Sidebar:', e);
            return [];
        } finally { setLoading(false); }
    }, []);

    const openFolder = useCallback(async (dir) => {
        const target = (dir || pathInput).trim();
        if (!target) return;
        onDirChange(target);
        setPathInput(target);
        const dirItems = await fetchDir(target);
        setItems(dirItems);
        setExpanded({});
        setChildItems({});
        setLoaded(true);
        saveRecent(target);
        setRecent(getRecent());
    }, [pathInput, onDirChange, fetchDir]);

    const toggleFolder = useCallback(async (folderPath) => {
        if (expanded[folderPath]) {
            setExpanded(prev => ({ ...prev, [folderPath]: false }));
        } else {
            if (!childItems[folderPath]) {
                const children = await fetchDir(folderPath);
                setChildItems(prev => ({ ...prev, [folderPath]: children }));
            }
            setExpanded(prev => ({ ...prev, [folderPath]: true }));
        }
    }, [expanded, childItems, fetchDir]);

    // Native folder picker — uses Chrome's File System Access API
    const browseFolderNative = useCallback(async () => {
        try {
            const handle = await window.showDirectoryPicker({ mode: 'read' });
            // Build the path — the API gives us the folder name, not full path.
            // We combine with a known root or ask server for the resolved path.
            const folderName = handle.name;
            // Ask server to resolve it from common locations
            const res = await fetch(`${API}/resolve-folder?name=${encodeURIComponent(folderName)}`);
            const data = await res.json();
            const resolved = data.path || folderName;
            await openFolder(resolved);
        } catch (e) {
            if (e.name !== 'AbortError') {
                // Fallback: just focus the path input
                document.querySelector('.path-input')?.focus();
            }
        }
    }, [openFolder]);

    const handleKey = (e) => { if (e.key === 'Enter') openFolder(); };

    const renderItem = (item, depth = 0) => {
        const isDir = item.type === 'directory';
        const isActive = item.path === activeFile;
        const isOpen = expanded[item.path];
        return (
            <div key={item.path} className="tree-group">
                <div
                    className={`tree-item ${isActive ? 'active' : ''}`}
                    style={{ paddingLeft: `${14 + depth * 14}px` }}
                    onClick={() => isDir ? toggleFolder(item.path) : onFileSelect(item.path)}
                >
                    <span className="icon">{isDir ? (isOpen ? '📂' : '📁') : getFileIcon(item.name)}</span>
                    <span className="name">{item.name}</span>
                    {!isDir && item.size > 0 && <span className="file-size">{formatSize(item.size)}</span>}
                </div>
                {isDir && isOpen && childItems[item.path] && (
                    <div className="tree-children">
                        {childItems[item.path].map(child => renderItem(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-section-label">Explorer</div>

                {/* Primary action: native folder browse button */}
                <button
                    className="open-folder-btn"
                    onClick={browseFolderNative}
                    title="Open a project folder"
                >
                    📂 Open Folder
                </button>

                {/* Fallback: manual path entry */}
                <div className="path-input-group">
                    <input
                        className="path-input"
                        type="text"
                        value={pathInput}
                        onChange={e => setPathInput(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="or paste a path…"
                    />
                    <button className="path-go-btn" onClick={() => openFolder()} title="Open folder">
                        {loading ? '…' : '→'}
                    </button>
                </div>
            </div>


            <div className="sidebar-tree">
                {!loaded && !loading && (
                    <div className="sidebar-empty">
                        <div className="sidebar-empty-icon">📁</div>
                        <div className="sidebar-empty-title">No folder open</div>
                        <div className="sidebar-empty-sub">Enter a project path above and press Enter</div>
                        {recent.length > 0 && (
                            <div className="recent-folders">
                                <div className="recent-label">Recent</div>
                                {recent.map(r => (
                                    <button
                                        key={r}
                                        className="recent-item"
                                        onClick={() => openFolder(r)}
                                        title={r}
                                    >
                                        📁 {r.split('\\').filter(Boolean).pop() || r}
                                        <span className="recent-path">{r}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                {loaded && items.length === 0 && !loading && (
                    <div className="sidebar-empty">
                        <div className="sidebar-empty-icon">🔍</div>
                        <div className="sidebar-empty-sub">No files found</div>
                    </div>
                )}
                {items.map(item => renderItem(item))}
            </div>

            {loaded && (
                <div className="sidebar-footer">
                    <span className="sidebar-cwd" title={currentDir}>
                        📁 {currentDir.split('\\').filter(Boolean).pop() || currentDir}
                    </span>
                    <button
                        className="change-folder-btn"
                        onClick={() => { setLoaded(false); setItems([]); setPathInput(''); }}
                        title="Change folder"
                    >
                        ⇄
                    </button>
                </div>
            )}
        </div>
    );
}

function getFileIcon(name) {
    const ext = name.split('.').pop().toLowerCase();
    const icons = {
        js: '🟨', jsx: '⚛️', ts: '🔷', tsx: '⚛️',
        css: '🎨', html: '🌐', json: '📋', md: '📝',
        py: '🐍', rs: '🦀', go: '🐹', java: '☕',
        png: '🖼️', jpg: '🖼️', svg: '🖼️', gif: '🖼️',
        txt: '📄', yml: '⚙️', yaml: '⚙️', toml: '⚙️',
        sh: '🔧', bat: '🔧', ps1: '🔧',
    };
    return icons[ext] || '📄';
}

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}
