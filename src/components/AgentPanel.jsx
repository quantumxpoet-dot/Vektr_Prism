import { useState, useEffect, useRef, useCallback } from 'react';

const API = '/api';

const STATE_LABELS = {
    idle: '⚪ Idle',
    planning: '🧠 Planning...',
    executing: '⚡ Executing...',
    verifying: '🧪 Verifying...',
    iterating: '🔄 Iterating...',
    waiting: '⏸️ Waiting for approval',
    complete: '✅ Complete',
    failed: '❌ Failed',
    aborted: '🛑 Aborted',
};

const TASK_TEMPLATES = [
    { label: '🔐 Add auth', value: 'Add JWT authentication with login and register routes' },
    { label: '🧪 Write tests', value: 'Write comprehensive unit tests for all existing functions' },
    { label: '🛡️ Error handling', value: 'Add proper error handling and input validation throughout the codebase' },
    { label: '📄 Add docs', value: 'Add JSDoc comments to all functions and create a README' },
    { label: '🔄 TypeScript', value: 'Convert this JavaScript project to TypeScript' },
    { label: '⚡ Optimize', value: 'Optimize performance: remove redundant code, add caching where appropriate' },
];

export default function AgentPanel({ currentDir }) {
    const [goal, setGoal] = useState('');
    const [mode, setMode] = useState('supervised');
    const [agentState, setAgentState] = useState('idle');
    const [plan, setPlan] = useState([]);
    const [currentStep, setCurrentStep] = useState(-1);
    const [totalSteps, setTotalSteps] = useState(0);
    const [logs, setLogs] = useState([]);
    const [isStarting, setIsStarting] = useState(false);

    // v4: tab auto-detection
    const [openTabs, setOpenTabs] = useState([]);
    const [selectedTab, setSelectedTab] = useState(null);
    const [tabsLoading, setTabsLoading] = useState(false);
    const [chromeConnected, setChromeConnected] = useState(false);

    // v4: git + notebooklm
    const [gitStatus, setGitStatus] = useState('');
    const [nlmStatus, setNlmStatus] = useState('');
    const [nlmExporting, setNlmExporting] = useState(false);

    // Session memory — restore last goal and mode
    useEffect(() => {
        const saved = localStorage.getItem('vektrprism_session');
        if (saved) {
            try {
                const s = JSON.parse(saved);
                if (s.goal) setGoal(s.goal);
                if (s.mode) setMode(s.mode);
            } catch { }
        }
    }, []);

    // Save session on changes
    useEffect(() => {
        localStorage.setItem('vektrprism_session', JSON.stringify({ goal, mode, dir: currentDir }));
    }, [goal, mode, currentDir]);

    const logEndRef = useRef(null);
    const eventSourceRef = useRef(null);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // SSE connection for live updates
    useEffect(() => {
        const es = new EventSource(`${API}/agent/stream`);
        eventSourceRef.current = es;
        es.addEventListener('log', (e) => {
            const entry = JSON.parse(e.data);
            setLogs(prev => [...prev.slice(-200), entry]);
        });
        es.addEventListener('state', (e) => {
            const data = JSON.parse(e.data);
            setAgentState(data.state);
            setCurrentStep(data.step);
            setTotalSteps(data.total);
        });
        es.addEventListener('plan', (e) => {
            const data = JSON.parse(e.data);
            setPlan(data.plan || []);
        });
        es.addEventListener('complete', () => setAgentState('complete'));
        return () => es.close();
    }, []);

    // v4: detect open AI tabs
    const detectTabs = useCallback(async () => {
        setTabsLoading(true);
        try {
            const res = await fetch(`${API}/tabs`);
            const data = await res.json();
            setChromeConnected(data.connected);
            setOpenTabs(data.tabs || []);
            if (data.tabs?.length > 0 && !selectedTab) {
                // Auto-select first AI tab
                const aiTab = data.tabs.find(t => t.isAI) || data.tabs[0];
                setSelectedTab(aiTab.providerId);
            }
        } finally {
            setTabsLoading(false);
        }
    }, [selectedTab]);

    // Auto-detect tabs on mount
    useEffect(() => { detectTabs(); }, []);

    // v4: git snapshot
    const takeGitSnapshot = async () => {
        if (!currentDir) return;
        setGitStatus('Snapshotting...');
        try {
            const res = await fetch(`${API}/git/snapshot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectDir: currentDir }),
            });
            const data = await res.json();
            setGitStatus(data.message);
            setTimeout(() => setGitStatus(''), 4000);
        } catch (e) {
            setGitStatus('Git error: ' + e.message);
        }
    };

    // One-click NotebookLM pipeline (export → open → create notebook → upload)
    const pushToNotebookLM = async () => {
        if (!currentDir) return;
        setNlmExporting(true);
        setNlmStatus('Starting...');
        try {
            const res = await fetch(`${API}/notebooklm-push`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dir: currentDir }),
            });

            // Stream NDJSON progress lines
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop(); // keep incomplete line
                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const evt = JSON.parse(line);
                        if (evt.error) {
                            setNlmStatus('❌ ' + evt.error);
                            setTimeout(() => setNlmStatus(''), 8000);
                            return;
                        }
                        setNlmStatus(`${evt.step}/${evt.total} ${evt.message}`);
                        if (evt.done) setTimeout(() => setNlmStatus(''), 8000);
                    } catch { /* ignore parse errors */ }
                }
            }
        } catch (e) {
            setNlmStatus('❌ ' + e.message);
            setTimeout(() => setNlmStatus(''), 8000);
        } finally {
            setNlmExporting(false);
        }
    };


    const startAgent = useCallback(async () => {
        if (!goal.trim() || !currentDir) return;
        setIsStarting(true);
        setLogs([]);
        setPlan([]);
        setCurrentStep(-1);
        try {
            const res = await fetch(`${API}/agent/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    goal,
                    projectDir: currentDir,
                    mode,
                    provider: selectedTab || 'generic',
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
        } catch (e) {
            setLogs(prev => [...prev, { timestamp: new Date().toISOString(), type: 'error', message: e.message }]);
        } finally {
            setIsStarting(false);
        }
    }, [goal, currentDir, mode, selectedTab]);

    const approve = async () => { await fetch(`${API}/agent/approve`, { method: 'POST' }); };
    const skip = async () => { await fetch(`${API}/agent/skip`, { method: 'POST' }); };
    const abort = async () => {
        await fetch(`${API}/agent/abort`, { method: 'POST' });
        setAgentState('aborted');
    };

    const isRunning = ['planning', 'executing', 'verifying', 'iterating'].includes(agentState);
    const isWaiting = agentState === 'waiting';
    const isIdle = ['idle', 'complete', 'failed', 'aborted'].includes(agentState);

    return (
        <div className="agent-panel">
            {/* Header */}
            <div className="agent-header">
                <div className="agent-title">
                    <span className="agent-icon">🤖</span>
                    <span>Agent Mode</span>
                    <span className="agent-state-badge" data-state={agentState}>
                        {STATE_LABELS[agentState] || agentState}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {(isRunning || isWaiting) && (
                        <div className="agent-progress">
                            Step {Math.max(0, currentStep + 1)} / {totalSteps}
                        </div>
                    )}
                    {/* v4: Chrome connection indicator */}
                    <div
                        className={`chrome-status ${chromeConnected ? 'connected' : 'disconnected'}`}
                        onClick={detectTabs}
                        title={chromeConnected ? 'Chrome connected — click to refresh tabs' : 'Chrome not connected — click to retry'}
                    >
                        {tabsLoading ? '⟳' : chromeConnected ? '🟢' : '🔴'} Chrome
                    </div>
                </div>
            </div>

            {/* v4: Tab Picker + Toolbox */}
            <div className="agent-toolbox">
                {/* AI Tab selector */}
                <div className="tab-picker">
                    {openTabs.length > 0 ? (
                        <select
                            className="tab-select"
                            value={selectedTab || ''}
                            onChange={e => setSelectedTab(e.target.value)}
                        >
                            {openTabs.map((tab, i) => (
                                <option key={i} value={tab.providerId}>
                                    {tab.isAI ? '✓ ' : ''}{tab.title}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <span className="tab-hint">
                            {chromeConnected ? 'No tabs found — open a chatbot' : 'Open Chrome with CDP to connect'}
                        </span>
                    )}
                    <button className="refresh-tabs-btn" onClick={detectTabs} title="Refresh tabs">⟳</button>
                </div>

                {/* Git snapshot + NotebookLM export */}
                <div className="toolbox-actions">
                    <button
                        className="git-snapshot-btn"
                        onClick={takeGitSnapshot}
                        disabled={!currentDir}
                        title="Commit current state before agent runs (safety net)"
                    >
                        📸 Git Snapshot
                    </button>
                    <button
                        className="nlm-export-btn"
                        onClick={pushToNotebookLM}
                        disabled={!currentDir || nlmExporting}
                        title="One-click: export project → open NotebookLM → create notebook → upload all files"
                    >
                        {nlmExporting ? '⏳ Uploading...' : '📓 → NotebookLM'}
                    </button>
                </div>
            </div>

            {/* Status messages */}
            {(gitStatus || nlmStatus) && (
                <div className="toolbox-status">
                    {gitStatus && <span className="status-msg git-msg">📸 {gitStatus}</span>}
                    {nlmStatus && <span className="status-msg nlm-msg">📓 {nlmStatus}</span>}
                </div>
            )}

            {/* Goal Input */}
            {isIdle && (
                <div className="agent-goal-section">
                    {/* Task templates */}
                    <div className="template-bar">
                        {TASK_TEMPLATES.map((t, i) => (
                            <button
                                key={i}
                                className="template-chip"
                                onClick={() => setGoal(t.value)}
                                title={t.value}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <textarea
                        className="agent-goal-input"
                        placeholder='Describe what you want built... (e.g. "Add JWT authentication with login/register routes")'
                        value={goal}
                        onChange={(e) => setGoal(e.target.value)}
                        rows={3}
                    />
                    <div className="agent-controls">
                        <div className="agent-mode-toggle">
                            <label className={`mode-option ${mode === 'supervised' ? 'active' : ''}`}>
                                <input type="radio" name="mode" value="supervised"
                                    checked={mode === 'supervised'} onChange={() => setMode('supervised')} />
                                ⏸️ Supervised
                            </label>
                            <label className={`mode-option ${mode === 'autonomous' ? 'active' : ''}`}>
                                <input type="radio" name="mode" value="autonomous"
                                    checked={mode === 'autonomous'} onChange={() => setMode('autonomous')} />
                                🚀 Autonomous
                            </label>
                        </div>
                        <button
                            className="agent-start-btn"
                            onClick={startAgent}
                            disabled={!goal.trim() || isStarting || !currentDir}
                        >
                            {isStarting ? '⏳ Starting...' : '▶ Start Agent'}
                        </button>
                    </div>
                </div>
            )}

            {/* Plan Steps */}
            {plan.length > 0 && (
                <div className="agent-plan">
                    <div className="plan-title">📋 Plan</div>
                    {plan.map((step, i) => (
                        <div key={i} className={`plan-step ${i < currentStep ? 'done' : i === currentStep ? 'active' : 'pending'}`}>
                            <span className="step-indicator">
                                {i < currentStep ? '✅' : i === currentStep ? (isRunning ? '⚡' : '⏸️') : '○'}
                            </span>
                            <span className="step-text">{step.stepNumber}. {step.description}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Action buttons */}
            {isWaiting && (
                <div className="agent-actions">
                    <button className="agent-approve-btn" onClick={approve}>✅ Approve & Continue</button>
                    <button className="agent-skip-btn" onClick={skip}>⏭️ Skip Step</button>
                    <button className="agent-abort-btn" onClick={abort}>🛑 Abort</button>
                </div>
            )}
            {isRunning && (
                <div className="agent-actions">
                    <button className="agent-abort-btn" onClick={abort}>🛑 Abort</button>
                </div>
            )}

            {/* Log output */}
            <div className="agent-log">
                {logs.map((entry, i) => (
                    <div key={i} className={`log-entry log-${entry.type}`}>
                        <span className="log-time">{entry.timestamp?.substring(11, 19)}</span>
                        <span className="log-type">[{entry.type}]</span>
                        <span className="log-msg">{entry.message}</span>
                    </div>
                ))}
                <div ref={logEndRef} />
            </div>
        </div>
    );
}
