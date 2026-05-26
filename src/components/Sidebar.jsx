import { useState, useCallback, useEffect } from 'react';

const API = '/api';

export default function Sidebar({ currentDir, onDirChange, onFileSelect, activeFile }) {
    const [items, setItems] = useState([]);
    const [expanded, setExpanded] = useState({});  // path -> boolean
    const [childItems, setChildItems] = useState({}); // path -> items[]
    const [pathInput, setPathInput] = useState(currentDir);
    const [loading, setLoading] = useState(false);

    // Fetch directory listing
    const fetchDir = useCallback(async (dir) => {
        try {
            setLoading(true);
            const res = await fetch(`${API}/files?dir=${encodeURIComponent(dir)}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            return data.items || [];
        } catch (e) {
            console.error('Sidebar fetch error:', e);
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    // Load root directory
    const loadRoot = useCallback(async () => {
        const dir = pathInput.trim();
        if (!dir) return;
        onDirChange(dir);
        const dirItems = await fetchDir(dir);
        setItems(dirItems);
        setExpanded({});
        setChildItems({});
    }, [pathInput, onDirChange, fetchDir]);

    // Load on mount
    useEffect(() => {
        loadRoot();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Toggle folder expand/collapse
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

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') loadRoot();
    };

    // Render a single tree item
    const renderItem = (item, depth = 0) => {
        const isDir = item.type === 'directory';
        const isActive = item.path === activeFile;
        const isOpen = expanded[item.path];

        return (
            <div key={item.path} className="tree-group">
                <div
                    className={`tree-item ${isActive ? 'active' : ''}`}
                    style={{ paddingLeft: `${16 + depth * 14}px` }}
                    onClick={() => isDir ? toggleFolder(item.path) : onFileSelect(item.path)}
                >
                    <span className="icon">
                        {isDir ? (isOpen ? '📂' : '📁') : getFileIcon(item.name)}
                    </span>
                    <span className="name">{item.name}</span>
                    {!isDir && item.size > 0 && (
                        <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-muted)' }}>
                            {formatSize(item.size)}
                        </span>
                    )}
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
                <div className="sidebar-brand">
                    <div className="logo-icon">V</div>
                    <h1>VEKTRIDE</h1>
                </div>
                <div className="path-input-group">
                    <input
                        className="path-input"
                        type="text"
                        value={pathInput}
                        onChange={(e) => setPathInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="C:\projects\my-app"
                    />
                    <button className="path-go-btn" onClick={loadRoot}>
                        {loading ? '…' : '→'}
                    </button>
                </div>
            </div>
            <div className="sidebar-tree">
                {items.length === 0 && !loading && (
                    <div style={{ padding: '16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                        Enter a path above and click →
                    </div>
                )}
                {items.map(item => renderItem(item))}
            </div>
        </div>
    );
}

// --- Helpers ---

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
