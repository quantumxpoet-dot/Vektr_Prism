import { useState, useEffect, useRef, useCallback } from 'react';

const API = '/api';

export default function ChatPanel({ currentFile, onAsk, onConfirm, isLoading }) {
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState([]);
    const [providers, setProviders] = useState([]);
    const [selectedProvider, setSelectedProvider] = useState('generic');
    const [systemPrompt, setSystemPrompt] = useState(
        () => localStorage.getItem('vektr_system_prompt') || ''
    );
    const [showSystemPrompt, setShowSystemPrompt] = useState(false);
    const [includeFile, setIncludeFile] = useState(true);
    const [promptHistory, setPromptHistory] = useState([]);
    const [historyIdx, setHistoryIdx] = useState(-1);
    const [pendingDiff, setPendingDiff] = useState(null); // { original, updated }
    const [copiedId, setCopiedId] = useState(null);

    const bottomRef = useRef(null);
    const inputRef = useRef(null);

    // Load providers
    useEffect(() => {
        fetch(`${API}/providers`)
            .then(r => r.json())
            .then(data => {
                const list = (data.providers || []).filter(p => !p._section);
                setProviders(list);
                if (data.openTabs?.length > 0) setSelectedProvider(data.openTabs[0].providerId);
                else if (list.length > 0) setSelectedProvider(list[0].id);
            })
            .catch(() => setProviders([
                { id: 'generic', name: 'Auto-Detect' },
                { id: 'chatgpt', name: 'ChatGPT' },
                { id: 'claude', name: 'Claude' },
                { id: 'gemini', name: 'Gemini' },
            ]));
    }, []);

    // Persist system prompt
    useEffect(() => {
        localStorage.setItem('vektr_system_prompt', systemPrompt);
    }, [systemPrompt]);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading, pendingDiff]);

    // Global keyboard: Ctrl+K focuses prompt
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const send = useCallback(async () => {
        if (!prompt.trim() || isLoading) return;
        const userMsg = prompt.trim();
        setPrompt('');
        setHistoryIdx(-1);

        // Track history
        setPromptHistory(h => [userMsg, ...h.slice(0, 49)]);

        // Add user bubble
        setMessages(prev => [...prev, {
            id: Date.now(),
            role: 'user',
            text: userMsg,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }]);

        // Build full prompt: system + optional file context + user message
        let fullPrompt = '';
        if (systemPrompt.trim()) fullPrompt += `[Context]: ${systemPrompt.trim()}\n\n`;
        if (includeFile && currentFile?.content) fullPrompt += `[File: ${currentFile.path.split('\\').pop()}]\n${currentFile.content}\n\n`;
        fullPrompt += userMsg;

        const response = await onAsk(fullPrompt, selectedProvider);
        if (response) {
            const newMsg = {
                id: Date.now() + 1,
                role: 'ai',
                text: response,
                provider: selectedProvider,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                canConfirm: !!currentFile,
                originalContent: currentFile?.content || null,
            };
            setMessages(prev => [...prev, newMsg]);
        }
    }, [prompt, isLoading, systemPrompt, includeFile, currentFile, onAsk, selectedProvider]);

    const handleKey = (e) => {
        // Send on Enter (not shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
            return;
        }
        // History navigation with up/down
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            const nextIdx = Math.min(historyIdx + 1, promptHistory.length - 1);
            if (promptHistory[nextIdx] !== undefined) {
                setPrompt(promptHistory[nextIdx]);
                setHistoryIdx(nextIdx);
            }
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIdx = historyIdx - 1;
            if (nextIdx < 0) { setPrompt(''); setHistoryIdx(-1); }
            else { setPrompt(promptHistory[nextIdx]); setHistoryIdx(nextIdx); }
        }
    };

    // Ctrl+S confirms pending change
    useEffect(() => {
        const handler = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's' && pendingDiff) {
                e.preventDefault();
                handleConfirm(pendingDiff.updated, pendingDiff.msgId);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [pendingDiff]);

    const handleConfirm = async (content, msgId) => {
        await onConfirm(content);
        setPendingDiff(null);
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, confirmed: true } : m));
    };

    const showDiff = (msg) => {
        setPendingDiff({
            msgId: msg.id,
            original: msg.originalContent || '',
            updated: msg.text,
        });
    };

    const copyMsg = (id, text) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 1500);
        });
    };

    const clearChat = () => { setMessages([]); setPendingDiff(null); };

    return (
        <div className="chat-panel">
            {/* Sticky header */}
            <div className="chat-panel-header">
                <span className="chat-panel-label">Provider</span>
                <select
                    className="chat-provider-select"
                    value={selectedProvider}
                    onChange={e => setSelectedProvider(e.target.value)}
                >
                    {providers.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <button
                    className={`nav-icon-btn ${showSystemPrompt ? 'active-icon' : ''}`}
                    title="System prompt / project context"
                    onClick={() => setShowSystemPrompt(s => !s)}
                >
                    ⚙️
                </button>
                {messages.length > 0 && (
                    <button className="chat-clear-btn" onClick={clearChat} title="Clear chat">✕</button>
                )}
            </div>

            {/* System prompt drawer */}
            {showSystemPrompt && (
                <div className="system-prompt-drawer">
                    <div className="system-prompt-label">
                        Project Context
                        <span className="system-prompt-hint">Prepended to every prompt silently</span>
                    </div>
                    <textarea
                        className="system-prompt-input"
                        placeholder={'e.g. "React + TypeScript. Always use functional components. Never use any."'}
                        value={systemPrompt}
                        onChange={e => setSystemPrompt(e.target.value)}
                        rows={3}
                    />
                </div>
            )}

            {/* Conversation area */}
            <div className="chat-messages">
                {messages.length === 0 && !isLoading && (
                    <div className="chat-empty">
                        <div className="chat-empty-icon">💬</div>
                        <div className="chat-empty-title">Ask AI anything</div>
                        <div className="chat-empty-sub">
                            {currentFile
                                ? `Working on ${currentFile.path.split('\\').pop()}`
                                : 'Open a file or ask anything'}
                        </div>
                        <div className="chat-suggestions">
                            {['Explain this code', 'Find bugs', 'Add error handling', 'Write tests'].map(s => (
                                <button key={s} className="suggestion-chip" onClick={() => { setPrompt(s); inputRef.current?.focus(); }}>{s}</button>
                            ))}
                        </div>
                        <div className="shortcut-hint">
                            <kbd>Ctrl+K</kbd> to focus · <kbd>↑</kbd> for history
                        </div>
                    </div>
                )}

                {messages.map((msg) => (
                    <div key={msg.id} className={`chat-message ${msg.role}`}>
                        <div className="chat-bubble">
                            <div className="bubble-text">{msg.text}</div>
                            {msg.role === 'ai' && (
                                <button
                                    className="bubble-copy-btn"
                                    onClick={() => copyMsg(msg.id, msg.text)}
                                    title="Copy response"
                                >
                                    {copiedId === msg.id ? '✓' : '📋'}
                                </button>
                            )}
                        </div>
                        <div className="bubble-meta">
                            {msg.role === 'ai' && <span>{msg.provider}</span>}
                            <span>{msg.time}</span>
                            {msg.confirmed && <span className="confirmed-badge">✅ Saved</span>}
                        </div>
                        {msg.role === 'ai' && msg.canConfirm && !msg.confirmed && (
                            <div className="bubble-actions">
                                <button
                                    className="show-diff-btn"
                                    onClick={() => showDiff(msg)}
                                    title="Preview changes before saving"
                                >
                                    🔍 Diff
                                </button>
                                <button
                                    className="confirm-change-btn"
                                    onClick={() => handleConfirm(msg.text, msg.id)}
                                    title="Ctrl+S"
                                >
                                    ✅ Confirm <kbd>Ctrl+S</kbd>
                                </button>
                            </div>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="chat-message ai">
                        <div className="chat-bubble loading-bubble">
                            <div className="typing-indicator">
                                <span /><span /><span />
                            </div>
                        </div>
                    </div>
                )}

                {/* Inline diff preview */}
                {pendingDiff && (
                    <div className="diff-preview">
                        <div className="diff-header">
                            <span>📄 Diff Preview</span>
                            <button className="diff-close" onClick={() => setPendingDiff(null)}>✕</button>
                        </div>
                        <div className="diff-body">
                            {computeDiff(pendingDiff.original, pendingDiff.updated).map((line, i) => (
                                <div key={i} className={`diff-line ${line.type}`}>
                                    <span className="diff-sign">{line.type === 'add' ? '+' : line.type === 'del' ? '-' : ' '}</span>
                                    <span className="diff-text">{line.text}</span>
                                </div>
                            ))}
                        </div>
                        <div className="diff-footer">
                            <button className="agent-abort-btn" onClick={() => setPendingDiff(null)}>Cancel</button>
                            <button
                                className="confirm-change-btn"
                                onClick={() => handleConfirm(pendingDiff.updated, pendingDiff.msgId)}
                            >
                                ✅ Confirm Change <kbd>Ctrl+S</kbd>
                            </button>
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Sticky input footer */}
            <div className="chat-input-footer">
                <textarea
                    ref={inputRef}
                    className="chat-prompt-input"
                    placeholder={currentFile
                        ? `Ask about ${currentFile.path.split('\\').pop()}... (Enter to send, ↑ history)`
                        : 'Ask AI anything... (Ctrl+K to focus)'}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={handleKey}
                    rows={2}
                    disabled={isLoading}
                />
                <div className="chat-footer-row">
                    <label className="include-file-toggle" title="Include file content in prompt">
                        <input
                            type="checkbox"
                            checked={includeFile}
                            onChange={e => setIncludeFile(e.target.checked)}
                            disabled={!currentFile}
                        />
                        <span>📎 Include file</span>
                    </label>
                    <button
                        className={`chat-send-btn ${isLoading ? 'loading' : ''}`}
                        onClick={send}
                        disabled={isLoading || !prompt.trim()}
                    >
                        {isLoading ? '⏳ Thinking...' : '🚀 Ask AI'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Pure JS diff — no dependencies
function computeDiff(original, updated) {
    const a = (original || '').split('\n');
    const b = (updated || '').split('\n');
    const result = [];
    const maxLines = Math.max(a.length, b.length);
    for (let i = 0; i < maxLines; i++) {
        if (i >= a.length) result.push({ type: 'add', text: b[i] });
        else if (i >= b.length) result.push({ type: 'del', text: a[i] });
        else if (a[i] !== b[i]) {
            result.push({ type: 'del', text: a[i] });
            result.push({ type: 'add', text: b[i] });
        } else {
            result.push({ type: 'same', text: a[i] });
        }
    }
    return result;
}
