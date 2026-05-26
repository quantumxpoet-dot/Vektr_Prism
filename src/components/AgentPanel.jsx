import { useState, useEffect, useRef, useCallback } from 'react';
import * as AI from '../lib/aiBridge.js';
import providersData from '../../providers.json';

const STATIC_PROVIDERS = (providersData.providers || [])
    .filter(p => p.id && !p._section)
    .map(p => ({ id: p.id, name: p.name }));

const TASK_TEMPLATES = [
    { label: '🔐 Add auth', value: 'Add JWT authentication with login and register routes' },
    { label: '🧪 Write tests', value: 'Write comprehensive unit tests for all existing functions' },
    { label: '🛡️ Error handling', value: 'Add proper error handling and input validation throughout the codebase' },
    { label: '📄 Add docs', value: 'Add JSDoc comments to all functions and create a README' },
    { label: '🔄 TypeScript', value: 'Convert this JavaScript project to TypeScript' },
    { label: '⚡ Optimize', value: 'Optimize performance: remove redundant code, add caching where appropriate' },
];

// Multi-step agent runs in the browser using clipboard bridge.
// Each step: build prompt → copy to clipboard → open AI tab → user pastes response → agent applies changes.

const STEP_PROMPTS = {
    plan: (goal, context) =>
        `You are a senior software engineer acting as an agentic coding assistant.

Project context:
${context || '(no files loaded)'}

Goal: ${goal}

First, create a numbered step-by-step PLAN to accomplish this goal. For each step include:
1. What file to modify or create
2. What change to make
3. Why this change is needed

Output ONLY a JSON array like:
[{"step": 1, "file": "src/auth.js", "action": "Create JWT middleware", "why": "Handles token validation"}]`,

    execute: (step, goal) =>
        `You are implementing step ${step.step} of a coding task.

Goal: ${goal}
Current step: ${step.action}
File: ${step.file}

Write the COMPLETE file content for ${step.file}. Output ONLY the raw code, no explanations, no markdown fences.`,
};

export default function AgentPanel({ currentDir, rootHandle }) {
    const [goal, setGoal] = useState('');
    const [selectedProvider, setSelectedProvider] = useState(
        () => localStorage.getItem('vektr_last_provider') || 'chatgpt'
    );
    const [agentState, setAgentState] = useState('idle'); // idle | planning | awaiting_plan | executing | awaiting_step | complete | aborted
    const [plan, setPlan] = useState([]);
    const [currentStep, setCurrentStep] = useState(-1);
    const [logs, setLogs] = useState([]);
    const [pendingPaste, setPendingPaste] = useState(null); // { type: 'plan'|'step', stepIdx? }

    const logEndRef = useRef(null);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Restore session
    useEffect(() => {
        const saved = localStorage.getItem('vektr_agent_session');
        if (saved) {
            try {
                const s = JSON.parse(saved);
                if (s.goal) setGoal(s.goal);
            } catch { }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('vektr_agent_session', JSON.stringify({ goal }));
    }, [goal]);

    const log = useCallback((type, message) => {
        setLogs(prev => [...prev.slice(-200), {
            type,
            message,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        }]);
    }, []);

    // Step 1: Generate plan via clipboard
    const startPlanning = useCallback(async () => {
        if (!goal.trim()) return;
        setAgentState('planning');
        setLogs([]);
        setPlan([]);
        setCurrentStep(-1);

        const prompt = STEP_PROMPTS.plan(goal, currentDir ? `Project: ${currentDir}` : '');
        await AI.clipboardAsk(prompt, selectedProvider);
        log('info', 'Planning prompt copied to clipboard. Paste it into your AI tab, then copy the JSON plan response.');
        setAgentState('awaiting_plan');
        setPendingPaste({ type: 'plan' });
    }, [goal, selectedProvider, currentDir, log]);

    // Paste plan response from clipboard
    const pastePlanResponse = useCallback(async () => {
        const text = await AI.readClipboardResponse();
        if (!text?.trim()) {
            log('error', 'Clipboard is empty. Copy the AI response first.');
            return;
        }

        // Try to extract JSON array from the response
        try {
            const match = text.match(/\[[\s\S]*\]/);
            if (!match) throw new Error('No JSON array found in response');
            const parsed = JSON.parse(match[0]);
            if (!Array.isArray(parsed)) throw new Error('Expected an array');
            setPlan(parsed);
            log('success', `Plan received: ${parsed.length} steps`);
            parsed.forEach((s, i) => log('plan', `Step ${i + 1}: ${s.action} → ${s.file}`));
            setAgentState('ready');
            setPendingPaste(null);
        } catch (e) {
            log('error', 'Could not parse plan: ' + e.message + '. Make sure AI returned a JSON array.');
        }
    }, [log]);

    // Execute next step
    const executeNextStep = useCallback(async () => {
        const nextIdx = currentStep + 1;
        if (nextIdx >= plan.length) {
            setAgentState('complete');
            log('success', '✅ All steps complete!');
            return;
        }

        const step = plan[nextIdx];
        setCurrentStep(nextIdx);
        setAgentState('executing');

        const prompt = STEP_PROMPTS.execute(step, goal);
        await AI.clipboardAsk(prompt, selectedProvider);
        log('info', `Step ${nextIdx + 1}/${plan.length}: "${step.action}" — prompt copied. Paste into AI, copy response, then click Paste Code.`);
        setAgentState('awaiting_step');
        setPendingPaste({ type: 'step', stepIdx: nextIdx });
    }, [currentStep, plan, goal, selectedProvider, log]);

    // Paste step code response
    const pasteStepResponse = useCallback(async () => {
        const code = await AI.readClipboardResponse();
        if (!code?.trim()) {
            log('error', 'Clipboard is empty. Copy the AI code response first.');
            return;
        }

        const step = plan[currentStep];
        log('code', `Received code for ${step.file} (${code.length} chars)`);

        // Note: In full implementation, this writes the code to the file via fileSystem.js
        // For now, we display it and mark step done
        log('success', `Step ${currentStep + 1} complete — apply code to ${step.file} in your editor.`);
        setPendingPaste(null);

        if (currentStep + 1 >= plan.length) {
            setAgentState('complete');
            log('success', '🎉 Agent task complete!');
        } else {
            setAgentState('ready');
        }
    }, [currentStep, plan, log]);

    const abort = useCallback(() => {
        setAgentState('aborted');
        setPendingPaste(null);
        log('warn', 'Agent aborted.');
    }, [log]);

    const reset = useCallback(() => {
        setAgentState('idle');
        setPlan([]);
        setCurrentStep(-1);
        setLogs([]);
        setPendingPaste(null);
    }, []);

    const isIdle = ['idle', 'complete', 'aborted'].includes(agentState);
    const progress = plan.length > 0 ? ((currentStep + 1) / plan.length) * 100 : 0;

    return (
        <div className="agent-panel">
            {/* Header */}
            <div className="agent-header">
                <div className="agent-title">
                    <span className="agent-icon">🤖</span>
                    <span>Agent Mode</span>
                    <span className="agent-state-badge" data-state={agentState}>
                        {{
                            idle: '⚪ Idle',
                            planning: '🧠 Planning...',
                            awaiting_plan: '⏳ Waiting for plan',
                            ready: '✅ Plan ready',
                            executing: '⚡ Executing...',
                            awaiting_step: '⏳ Waiting for code',
                            complete: '✅ Complete',
                            aborted: '🛑 Aborted',
                        }[agentState] || agentState}
                    </span>
                </div>
                {plan.length > 0 && (
                    <div className="agent-progress-row">
                        <div className="agent-progress-bar-outer">
                            <div className="agent-progress-bar-inner" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="agent-progress-label">
                            {Math.max(0, currentStep + 1)} / {plan.length}
                        </span>
                    </div>
                )}
            </div>

            {/* Provider selector */}
            <div className="agent-provider-row">
                <span className="agent-label">AI Provider</span>
                <select
                    className="chat-provider-select"
                    value={selectedProvider}
                    onChange={e => { setSelectedProvider(e.target.value); localStorage.setItem('vektr_last_provider', e.target.value); }}
                >
                    {STATIC_PROVIDERS.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
            </div>

            {/* Goal Input */}
            {isIdle && (
                <div className="agent-goal-section">
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
                        onChange={e => setGoal(e.target.value)}
                        rows={3}
                    />
                    <button
                        className="agent-start-btn"
                        onClick={startPlanning}
                        disabled={!goal.trim()}
                    >
                        ▶ Start Agent
                    </button>
                </div>
            )}

            {/* Clipboard action banner */}
            {pendingPaste && (
                <div className="paste-response-banner">
                    {pendingPaste.type === 'plan' ? (
                        <>
                            <span>📋 Planning prompt copied! Paste into your AI tab, get the step-by-step plan, copy it, then:</span>
                            <button className="paste-response-btn" onClick={pastePlanResponse}>
                                📥 Paste Plan
                            </button>
                        </>
                    ) : (
                        <>
                            <span>📋 Code prompt copied for <strong>{plan[currentStep]?.file}</strong>. Paste into AI, copy the code response, then:</span>
                            <button className="paste-response-btn" onClick={pasteStepResponse}>
                                📥 Paste Code
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* Plan steps */}
            {plan.length > 0 && (
                <div className="agent-plan">
                    <div className="plan-title">📋 Plan — {plan.length} steps</div>
                    {plan.map((step, i) => (
                        <div key={i} className={`plan-step ${i < currentStep ? 'done' : i === currentStep ? 'active' : 'pending'}`}>
                            <span className="step-indicator">
                                {i < currentStep ? '✅' : i === currentStep ? '⚡' : '○'}
                            </span>
                            <div className="step-content">
                                <span className="step-text">{step.step}. {step.action}</span>
                                <span className="step-file">{step.file}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Action buttons */}
            {agentState === 'ready' && (
                <div className="agent-actions">
                    <button className="agent-approve-btn" onClick={executeNextStep}>
                        ▶ Execute Step {currentStep + 2}
                    </button>
                    <button className="agent-abort-btn" onClick={abort}>🛑 Abort</button>
                </div>
            )}
            {(agentState === 'complete' || agentState === 'aborted') && (
                <div className="agent-actions">
                    <button className="agent-approve-btn" onClick={reset}>↩ New Task</button>
                </div>
            )}
            {(agentState === 'executing' || agentState === 'planning') && (
                <div className="agent-actions">
                    <button className="agent-abort-btn" onClick={abort}>🛑 Abort</button>
                </div>
            )}

            {/* Log */}
            <div className="agent-log">
                {logs.length === 0 && agentState === 'idle' && (
                    <div className="agent-log-empty">
                        <div>Describe your goal above and click <strong>Start Agent</strong>.</div>
                        <div style={{ marginTop: 8, opacity: 0.6, fontSize: 12 }}>
                            The agent will plan the work, then walk you through each step using your AI chatbot.
                        </div>
                    </div>
                )}
                {logs.map((entry, i) => (
                    <div key={i} className={`log-entry log-${entry.type}`}>
                        <span className="log-time">{entry.time}</span>
                        <span className="log-msg">{entry.message}</span>
                    </div>
                ))}
                <div ref={logEndRef} />
            </div>
        </div>
    );
}
