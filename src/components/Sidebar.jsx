import { useState, useCallback, useEffect } from 'react';
import * as FS from '../lib/fileSystem.js';

const DONE_KEY = 'vektr_onboarding_done';

export default function Sidebar({ onFileSelect, onDirOpen }) {
    const [root, setRoot] = useState(null); // { handle, name }
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState({});
    const [childItems, setChildItems] = useState({});
    const [activeFile, setActiveFile] = useState(null);
    const [recent, setRecent] = useState(() => {
        try { return JSON.parse(localStorage.getItem('vektr_recent_names') || '[]'); }
        catch { return []; }
    });
    const [error, setError] = useState(null);

    // Try restoring the last-opened folder on mount
    useEffect(() => {
        (async () => {
            if (!FS.isSupported()) return;
            const restored = await FS.restoreFolder();
            if (restored) {
                await loadRoot(restored);
            }
        })();
    }, []);

    const loadRoot = useCallback(async ({ handle, name }) => {
        setLoading(true);
        setError(null);
        setItems([]);
        setExpanded({});
        setChildItems({});
        try {
            const children = await FS.listDir(handle);
            setRoot({ handle, name });
            setItems(children);
            onDirOpen?.(name);

            // Save name to recent list
            setRecent(prev => {
                const next = [name, ...prev.filter(r => r !== name)].slice(0, 6);
                localStorage.setItem('vektr_recent_names', JSON.stringify(next));
                return next;
            });
        } catch (e) {
            setError('Could not read folder: ' + e.message);
        } finally {
            setLoading(false);
        }
    }, [onDirOpen]);

    const openFolder = useCallback(async () => {
        if (!FS.isSupported()) {
            setError('File System Access API requires Chrome or Edge on desktop.');
            return;
        }
        try {
            const result = await FS.openFolder();
            await loadRoot(result);
        } catch (e) {
            if (e.name !== 'AbortError') setError(e.message);
        }
    }, [loadRoot]);

    const reconnect = useCallback(async () => {
        const restored = await FS.restoreFolder();
        if (restored) await loadRoot(restored);
        else setError('Permission denied. Please re-open the folder.');
    }, [loadRoot]);

    const toggleFolder = useCallback(async (item) => {
        const key = item.path;
        if (expanded[key]) {
            setExpanded(prev => ({ ...prev, [key]: false }));
            return;
        }
        setExpanded(prev => ({ ...prev, [key]: true }));
        if (!childItems[key]) {
            try {
                const children = await FS.listDir(item.handle, item.path);
                setChildItems(prev => ({ ...prev, [key]: children }));
            } catch { /* unreadable dir */ }
        }
    }, [expanded, childItems]);

    const selectFile = useCallback(async (item) => {
        setActiveFile(item.path);
        try {
            const fileData = await FS.readFile(item.handle);
            onFileSelect?.({ ...fileData, path: item.path, handle: item.handle });
        } catch (e) {
            setError('Could not read file: ' + e.message);
        }
    }, [onFileSelect]);

    const renderItem = (item, depth = 0) => {
        const isDir = item.type === 'directory';
        const isActive = item.path === activeFile;
        const isOpen = expanded[item.path];

        return (
            <div key={item.path} className="tree-group">
                <div
                    className={`tree-item ${isActive ? 'active' : ''}`}
                    style={{ paddingLeft: `${14 + depth * 14}px` }}
                    onClick={() => isDir ? toggleFolder(item) : selectFile(item)}
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

                {!root ? (
                    <>
                        <button className="open-folder-btn" onClick={openFolder}>
                            📂 Open Folder
                        </button>
                        {error && <div className="sidebar-error">{error}</div>}
                        {recent.length > 0 && (
                            <div className="recent-folders">
                                <div className="recent-label">Recent</div>
                                {recent.map(name => (
                                    <button
                                        key={name}
                                        className="recent-item"
                                        onClick={openFolder}
                                        title={`Reopen ${name}`}
                                    >
                                        📁 {name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="sidebar-root-row">
                        <span className="sidebar-root-name" title={root.name}>📁 {root.name}</span>
                        <button className="change-folder-btn" onClick={openFolder} title="Open different folder">⇄</button>
                    </div>
                )}
            </div>

            <div className="sidebar-tree">
                {loading && <div className="sidebar-loading">Loading…</div>}
                {error && root && (
                    <div className="sidebar-error">
                        {error}
                        <button onClick={reconnect} className="reconnect-btn">Re-connect</button>
                    </div>
                )}
                {root && !loading && items.length === 0 && (
                    <div className="sidebar-empty">
                        <div className="sidebar-empty-icon">🔍</div>
                        <div className="sidebar-empty-sub">No files found</div>
                    </div>
                )}
                {!root && !loading && (
                    <div className="sidebar-empty">
                        <div className="sidebar-empty-icon">📁</div>
                        <div className="sidebar-empty-title">No folder open</div>
                        <div className="sidebar-empty-sub">Click Open Folder to get started</div>
                    </div>
                )}
                {items.map(item => renderItem(item))}
            </div>

            {root && (
                <div className="sidebar-footer">
                    <span className="sidebar-cwd" title={root.name}>📁 {root.name}</span>
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
