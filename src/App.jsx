import { useState, useCallback, useRef, useEffect } from 'react';
import TopNav from './components/TopNav.jsx';
import Sidebar from './components/Sidebar.jsx';
import Editor from './components/Editor.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import AgentPanel from './components/AgentPanel.jsx';
import OnboardingWizard from './components/OnboardingWizard.jsx';
import * as FS from './lib/fileSystem.js';
import * as AI from './lib/aiBridge.js';

const MIN_CHAT_WIDTH = 260;
const MAX_CHAT_WIDTH = 600;

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
    const [currentFile, setCurrentFile] = useState(null); // { path, content, extension, handle, lastModified }
    const [currentDirName, setCurrentDirName] = useState('');
    const [isAsking, setIsAsking] = useState(false);
    const [viewMode, setViewMode] = useState('manual');
    const [toast, setToast] = useState(null);
    const [chatWidth, setChatWidth] = useState(350);
    const [mobileTab, setMobileTab] = useState('chat');
    const [showOnboarding, setShowOnboarding] = useState(
        () => !localStorage.getItem('vektr_onboarding_done')
    );
    // Clipboard bridge state
    const [pendingResponse, setPendingResponse] = useState(null);

    const isMobile = useMobile();
    const isDragging = useRef(false);
    const dragStartX = useRef(0);
    const dragStartWidth = useRef(0);

    const showToast = useCallback((msg, type = 'info') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    // File opened from Sidebar (receives { path, content, extension, handle, lastModified })
    const onFileOpen = useCallback((fileData) => {
        setCurrentFile(fileData);
        if (isMobile) setMobileTab('editor');
    }, [isMobile]);

    const onEditorChange = useCallback((value) => {
        setCurrentFile(prev => prev ? { ...prev, content: value } : null);
    }, []);

    // Save current file via File System Access API
    const saveFile = useCallback(async (content) => {
        if (!currentFile?.handle) return;
        try {
            await FS.writeFile(currentFile.handle, content ?? currentFile.content);
            showToast('Saved ✓', 'success');
        } catch (e) {
            showToast('Save failed: ' + e.message, 'error');
        }
    }, [currentFile, showToast]);

    // Ask AI via clipboard bridge or API key mode
    const askAI = useCallback(async (prompt, providerId) => {
        if (!prompt.trim()) return null;
        setIsAsking(true);
        try {
            const result = await AI.askAI(prompt, providerId || 'chatgpt');
            if (result.mode === 'clipboard') {
                // Show "paste response" UI
                setPendingResponse({ providerId, prompt });
                showToast('Prompt copied! Paste response when ready.', 'info');
                return null; // response comes via pasteResponse()
            }
            // API mode — got response directly
            return result.response;
        } catch (e) {
            showToast(e.message, 'error');
            return null;
        } finally {
            setIsAsking(false);
        }
    }, [showToast]);

    // "Paste Response" button handler — reads clipboard
    const pasteResponse = useCallback(async () => {
        const text = await AI.readClipboardResponse();
        setPendingResponse(null);
        return text;
    }, []);

    // Apply AI response to file
    const confirmChange = useCallback(async (content) => {
        if (!currentFile?.handle || !content) return;
        try {
            await FS.writeFile(currentFile.handle, content);
            setCurrentFile(prev => ({ ...prev, content }));
            showToast('Applied & saved ✓', 'success');
        } catch (e) {
            showToast('Save failed: ' + e.message, 'error');
        }
    }, [currentFile, showToast]);

    // Drag-to-resize chat panel (desktop)
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
            onPasteResponse={pasteResponse}
            pendingResponse={pendingResponse}
            isLoading={isAsking}
        />
    );

    const agentPanel = <AgentPanel currentDir={currentDirName} />;

    // ── MOBILE ────────────────────────────────────────────────────
    if (isMobile) {
        return (
            <div className="ide-root mobile">
                {showOnboarding && <OnboardingWizard onComplete={() => setShowOnboarding(false)} />}
                <TopNav viewMode={viewMode} setViewMode={setViewMode} currentFile={currentFile} />
                <div className="mobile-body">
                    {mobileTab === 'explorer' && (
                        <Sidebar onFileSelect={onFileOpen} onDirOpen={setCurrentDirName} />
                    )}
                    {mobileTab === 'editor' && (
                        <div className="mobile-editor-wrap">
                            <div className="tab-bar">
                                <div className="tab active">
                                    {currentFile
                                        ? <><span className="tab-icon">📄</span><span>{currentFile.path.split('/').pop()}</span></>
                                        : <><span className="tab-icon">🏠</span><span>No file open</span></>
                                    }
                                </div>
                            </div>
                            <div className="editor-area">
                                <Editor file={currentFile} onChange={onEditorChange} />
                            </div>
                        </div>
                    )}
                    {mobileTab === 'chat' && (viewMode === 'manual' ? chatPanel : agentPanel)}
                    {mobileTab === 'agent' && agentPanel}
                </div>
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

    // ── DESKTOP ───────────────────────────────────────────────────
    return (
        <div className="ide-root">
            {showOnboarding && <OnboardingWizard onComplete={() => setShowOnboarding(false)} />}
            <TopNav viewMode={viewMode} setViewMode={setViewMode} currentFile={currentFile} />
            <div className="ide-body">
                <Sidebar onFileSelect={onFileOpen} onDirOpen={setCurrentDirName} />
                <div className="editor-column">
                    <div className="tab-bar">
                        <div className="tab active">
                            {currentFile
                                ? <><span className="tab-icon">📄</span><span>{currentFile.path.split('/').pop()}</span></>
                                : <><span className="tab-icon">🏠</span><span>Welcome</span></>
                            }
                        </div>
                        {currentFile && (
                            <button className="save-btn" onClick={() => saveFile()} title="Save (Ctrl+S)">
                                💾 Save
                            </button>
                        )}
                    </div>
                    <div className="editor-area">
                        <Editor file={currentFile} onChange={onEditorChange} />
                    </div>
                    <div className="status-bar">
                        <div className="status-left">
                            <span>{currentFile ? currentFile.path : 'No file open'}</span>
                        </div>
                        <div className="status-right">
                            <span>{currentFile?.extension?.toUpperCase()}</span>
                            <span>Vektr Prism</span>
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
