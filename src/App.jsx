import { useState, useCallback, useRef, useEffect } from 'react';
import TopNav from './components/TopNav.jsx';
import Sidebar from './components/Sidebar.jsx';
import Editor from './components/Editor.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import AgentPanel from './components/AgentPanel.jsx';

const API = '/api';
const MIN_CHAT_WIDTH = 260;
const MAX_CHAT_WIDTH = 600;

// Mobile bottom tab config
const MOBILE_TABS = [
    { id: 'explorer', label: 'Files', icon: '📁' },
    { id: 'editor', label: 'Editor', icon: '⌨️' },
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'agent', label: 'Agent', icon: '🤖' },
];

function useMobile() {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)');
        const handler = (e) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);
    return isMobile;
}

export default function App() {
    const [currentFile, setCurrentFile] = useState(null);
    const [currentDir, setCurrentDir] = useState('');
    const [isAsking, setIsAsking] = useState(false);
    const [viewMode, setViewMode] = useState('manual');
    const [toast, setToast] = useState(null);
    const [chatWidth, setChatWidth] = useState(350);
    const [fileStale, setFileStale] = useState(false);
    const [mobileTab, setMobileTab] = useState('chat'); // default to chat on mobile

    const isMobile = useMobile();
    const isDragging = useRef(false);
    const dragStartX = useRef(0);
    const dragStartWidth = useRef(0);
    const watchIntervalRef = useRef(null);

    const showToast = useCallback((msg, type = 'info') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    // File watcher — poll for external changes every 3s
    useEffect(() => {
        if (!currentFile?.path) {
            clearInterval(watchIntervalRef.current);
            setFileStale(false);
            return;
        }
        watchIntervalRef.current = setInterval(async () => {
            try {
                const res = await fetch(`${API}/file-mtime?path=${encodeURIComponent(currentFile.path)}`);
                const data = await res.json();
                if (data.mtime && data.mtime !== currentFile.mtime) setFileStale(true);
            } catch { }
        }, 3000);
        return () => clearInterval(watchIntervalRef.current);
    }, [currentFile?.path, currentFile?.mtime]);

    const openFile = useCallback(async (filePath) => {
        try {
            const res = await fetch(`${API}/file?path=${encodeURIComponent(filePath)}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setCurrentFile({ path: data.path, content: data.content, extension: data.extension, mtime: data.mtime });
            setFileStale(false);
            // On mobile: switch to editor after opening file
            if (isMobile) setMobileTab('editor');
        } catch (e) {
            showToast(`Failed to open: ${e.message}`, 'error');
        }
    }, [showToast, isMobile]);

    const reloadFile = useCallback(() => {
        if (currentFile?.path) openFile(currentFile.path);
    }, [currentFile, openFile]);

    const onEditorChange = useCallback((value) => {
        setCurrentFile(prev => prev ? { ...prev, content: value } : null);
    }, []);

    const askAI = useCallback(async (prompt, providerId) => {
        if (!prompt.trim()) return null;
        setIsAsking(true);
        try {
            const res = await fetch(`${API}/ask-ai`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, code: '', provider: providerId, filePath: currentFile?.path || '' }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            showToast(`✓ Response from ${data.provider}`, 'success');
            return data.response;
        } catch (e) {
            showToast(e.message, 'error');
            return `Error: ${e.message}`;
        } finally {
            setIsAsking(false);
        }
    }, [currentFile, showToast]);

    const confirmChange = useCallback(async (content) => {
        if (!currentFile?.path || !content) return;
        try {
            const res = await fetch(`${API}/save-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: currentFile.path, content }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setCurrentFile(prev => ({ ...prev, content, mtime: data.mtime || prev.mtime }));
            setFileStale(false);
            showToast('Saved ✓', 'success');
        } catch (e) {
            showToast(`Save failed: ${e.message}`, 'error');
        }
    }, [currentFile, showToast]);

    // Drag-to-resize (desktop only)
    const onDividerMouseDown = (e) => {
        e.preventDefault();
        isDragging.current = true;
        dragStartX.current = e.clientX;
        dragStartWidth.current = chatWidth;
        const onMove = (ev) => {
            if (!isDragging.current) return;
            const delta = dragStartX.current - ev.clientX;
            setChatWidth(Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, dragStartWidth.current + delta)));
        };
        const onUp = () => {
            isDragging.current = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    const chatPanel = (
        <ChatPanel
            currentFile={currentFile}
            onAsk={askAI}
            onConfirm={confirmChange}
            isLoading={isAsking}
        />
    );

    const agentPanel = <AgentPanel currentDir={currentDir} />;

    // ── MOBILE LAYOUT ────────────────────────────────────────────
    if (isMobile) {
        return (
            <div className="ide-root mobile">
                <TopNav viewMode={viewMode} setViewMode={setViewMode} currentFile={currentFile} />
                <div className="mobile-body">
                    {mobileTab === 'explorer' && (
                        <Sidebar
                            currentDir={currentDir}
                            onDirChange={setCurrentDir}
                            onFileSelect={(p) => { openFile(p); }}
                            activeFile={currentFile?.path}
                        />
                    )}
                    {mobileTab === 'editor' && (
                        <div className="mobile-editor-wrap">
                            <div className="tab-bar">
                                <div className="tab active">
                                    {currentFile
                                        ? <><span className="tab-icon">📄</span><span>{currentFile.path.split('\\').pop()}</span></>
                                        : <><span className="tab-icon">🏠</span><span>No file open</span></>
                                    }
                                </div>
                                {fileStale && (
                                    <button className="stale-banner" onClick={reloadFile}>⟳ Reload</button>
                                )}
                            </div>
                            <div className="editor-area">
                                <Editor file={currentFile} onChange={onEditorChange} />
                            </div>
                        </div>
                    )}
                    {mobileTab === 'chat' && (viewMode === 'manual' ? chatPanel : agentPanel)}
                    {mobileTab === 'agent' && agentPanel}
                </div>

                {/* Mobile bottom tab bar */}
                <nav className="mobile-bottom-nav">
                    {MOBILE_TABS.map(tab => (
                        <button
                            key={tab.id}
                            className={`mobile-tab-btn ${mobileTab === tab.id ? 'active' : ''}`}
                            onClick={() => setMobileTab(tab.id)}
                        >
                            <span className="mobile-tab-icon">{tab.icon}</span>
                            <span className="mobile-tab-label">{tab.label}</span>
                        </button>
                    ))}
                </nav>

                {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
            </div>
        );
    }

    // ── DESKTOP LAYOUT ───────────────────────────────────────────
    return (
        <div className="ide-root">
            <TopNav viewMode={viewMode} setViewMode={setViewMode} currentFile={currentFile} />
            <div className="ide-body">
                <Sidebar
                    currentDir={currentDir}
                    onDirChange={setCurrentDir}
                    onFileSelect={openFile}
                    activeFile={currentFile?.path}
                />
                <div className="editor-column">
                    <div className="tab-bar">
                        <div className="tab active">
                            {currentFile
                                ? <><span className="tab-icon">📄</span><span>{currentFile.path.split('\\').pop()}</span></>
                                : <><span className="tab-icon">🏠</span><span>Welcome</span></>
                            }
                        </div>
                        {fileStale && (
                            <button className="stale-banner" onClick={reloadFile}>
                                ⟳ File changed externally — reload?
                            </button>
                        )}
                    </div>
                    <div className="editor-area">
                        <Editor file={currentFile} onChange={onEditorChange} />
                    </div>
                    <div className="status-bar">
                        <div className="status-left"><span>{currentFile ? currentFile.path : 'No file open'}</span></div>
                        <div className="status-right">
                            <span>{currentFile?.extension?.toUpperCase()}</span>
                            <span>Vektr Prism v3</span>
                        </div>
                    </div>
                </div>
                <div className="panel-divider" onMouseDown={onDividerMouseDown} title="Drag to resize" />
                <div className="chat-sidebar" style={{ width: chatWidth, minWidth: chatWidth }}>
                    {viewMode === 'manual' ? chatPanel : agentPanel}
                </div>
            </div>
            {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
        </div>
    );
}
