import { useState } from 'react';

const DONE_KEY = 'vektr_onboarding_done';
const SELECTED_KEY = 'vektr_selected_providers';

// Provider cards — free-tier AI chat interfaces only
const ONBOARDING_PROVIDERS = [
    { id: 'chatgpt', name: 'ChatGPT', icon: '🤖', url: 'https://chatgpt.com', desc: 'GPT-4o, custom GPTs — free tier', color: '#10a37f' },
    { id: 'claude', name: 'Claude', icon: '✦', url: 'https://claude.ai', desc: 'Claude 3.5 Sonnet — free tier', color: '#d4a276' },
    { id: 'gemini', name: 'Gemini', icon: '✦', url: 'https://gemini.google.com', desc: 'Gemini 1.5 Pro, Gems — free', color: '#4285f4' },
    { id: 'grok', name: 'Grok', icon: '𝕏', url: 'https://grok.com', desc: 'Grok 2, real-time web — free', color: '#1a1a1a' },
    { id: 'copilot', name: 'Copilot', icon: '🪟', url: 'https://copilot.microsoft.com', desc: 'GPT-4 via Microsoft — free', color: '#0078d4' },
    { id: 'manus', name: 'Manus', icon: '🤝', url: 'https://manus.im', desc: 'Autonomous agentic AI', color: '#6c47ff' },
    { id: 'perplexity', name: 'Perplexity', icon: '🔍', url: 'https://perplexity.ai', desc: 'AI search + reasoning — free', color: '#1fb8cd' },
    { id: 'deepseek', name: 'DeepSeek', icon: '🐳', url: 'https://chat.deepseek.com', desc: 'R1, V3 — completely free', color: '#4d6bfe' },
    { id: 'meta-ai', name: 'Meta AI', icon: '🔵', url: 'https://meta.ai', desc: 'Llama 4 — completely free', color: '#0866ff' },
    { id: 'gemini-studio', name: 'AI Studio', icon: '🧪', url: 'https://aistudio.google.com', desc: 'Gemini API playground — free', color: '#4285f4' },
    { id: 'notebooklm', name: 'NotebookLM', icon: '📓', url: 'https://notebooklm.google.com', desc: 'Codebase-grounded AI — free', color: '#34a853' },
    { id: 'vertex', name: 'Vertex AI', icon: '☁️', url: 'https://console.cloud.google.com', desc: 'Enterprise Gemini, GCloud', color: '#fbbc04' },
];

export default function OnboardingWizard({ onComplete }) {
    const [step, setStep] = useState(0); // 0=welcome, 1=pick, 2=connect, 3=done
    const [selected, setSelected] = useState(new Set());
    const [tabStatuses, setTabStatuses] = useState({});
    const [connectedCount, setConnectedCount] = useState(0);

    const toggle = (id) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const openTabs = () => {
        setStep(2);
        const providers = ONBOARDING_PROVIDERS.filter(p => selected.has(p.id));
        const statuses = {};
        providers.forEach(p => { statuses[p.id] = 'waiting'; });
        setTabStatuses(statuses);

        // Open each provider in a popup window
        // When the user closes the popup (after signing in), mark as connected
        for (const p of providers) {
            const popup = window.open(
                p.url,
                `vektr_${p.id}`,
                'width=900,height=700,menubar=no,toolbar=no,location=yes'
            );

            if (!popup) {
                // Popup blocked — mark as waiting, user must open manually
                continue;
            }

            // Poll until popup is closed
            const interval = setInterval(() => {
                if (popup.closed) {
                    clearInterval(interval);
                    setTabStatuses(prev => ({ ...prev, [p.id]: 'connected' }));
                    setConnectedCount(c => c + 1);
                }
            }, 500);

            // Auto-timeout after 10 min
            setTimeout(() => clearInterval(interval), 600000);
        }
    };

    const finish = () => {
        localStorage.setItem(DONE_KEY, 'true');
        localStorage.setItem(SELECTED_KEY, JSON.stringify([...selected]));
        onComplete([...selected]);
    };

    const skip = () => {
        localStorage.setItem(DONE_KEY, 'true');
        onComplete([]);
    };

    const selectedProviders = ONBOARDING_PROVIDERS.filter(p => selected.has(p.id));

    return (
        <div className="onboarding-overlay">
            <div className="onboarding-card">

                {/* ── Step 0: Welcome ───────────────────────────── */}
                {step === 0 && (
                    <div className="onboarding-step">
                        <div className="onboarding-logo">🔮</div>
                        <h1 className="onboarding-title">Welcome to Vektr Prism</h1>
                        <p className="onboarding-sub">
                            A free agentic IDE powered by the AI chatbots you already use.<br />
                            No API keys. No subscriptions. No downloads.
                        </p>
                        <div className="onboarding-features">
                            <div className="onboarding-feature">🆓 <span>Works entirely on free AI tiers — ChatGPT, Claude, Gemini and more</span></div>
                            <div className="onboarding-feature">📁 <span>Read and write your local files directly in the browser</span></div>
                            <div className="onboarding-feature">🤖 <span>Multi-step agentic tasks across your entire codebase</span></div>
                        </div>
                        <div className="onboarding-actions">
                            <button className="onboarding-primary" onClick={() => setStep(1)}>
                                Get Started →
                            </button>
                            <button className="onboarding-skip" onClick={skip}>Skip setup</button>
                        </div>
                    </div>
                )}

                {/* ── Step 1: Pick providers ────────────────────── */}
                {step === 1 && (
                    <div className="onboarding-step">
                        <h2 className="onboarding-title">Which AI chatbots do you use?</h2>
                        <p className="onboarding-sub">
                            Select all that apply — we'll open them so you can sign in once.<br />
                            All of these have free plans with powerful models.
                        </p>

                        <div className="provider-grid">
                            {ONBOARDING_PROVIDERS.map(p => (
                                <button
                                    key={p.id}
                                    className={`provider-card ${selected.has(p.id) ? 'selected' : ''}`}
                                    onClick={() => toggle(p.id)}
                                    style={{ '--provider-color': p.color }}
                                >
                                    <div className="provider-card-check">{selected.has(p.id) ? '✓' : ''}</div>
                                    <div className="provider-card-icon">{p.icon}</div>
                                    <div className="provider-card-name">{p.name}</div>
                                    <div className="provider-card-desc">{p.desc}</div>
                                </button>
                            ))}
                        </div>

                        <div className="onboarding-actions">
                            <button
                                className="onboarding-primary"
                                disabled={selected.size === 0}
                                onClick={openTabs}
                            >
                                Open {selected.size > 0 ? `${selected.size} ` : ''}Tab{selected.size !== 1 ? 's' : ''} & Sign In →
                            </button>
                            <button className="onboarding-skip" onClick={skip}>Skip</button>
                        </div>
                    </div>
                )}

                {/* ── Step 2: Sign in ───────────────────────────── */}
                {step === 2 && (
                    <div className="onboarding-step">
                        <h2 className="onboarding-title">Sign in to your AI accounts</h2>
                        <p className="onboarding-sub">
                            Each chatbot opened in a popup. Sign in, then close the popup.<br />
                            It'll turn green automatically.
                        </p>

                        <div className="connect-list">
                            {selectedProviders.map(p => {
                                const status = tabStatuses[p.id] || 'waiting';
                                return (
                                    <div key={p.id} className={`connect-item ${status}`}>
                                        <span className="connect-icon">{p.icon}</span>
                                        <span className="connect-name">{p.name}</span>
                                        <span className="connect-status">
                                            {status === 'waiting' && <span className="status-dot waiting">⏳ Waiting for sign-in</span>}
                                            {status === 'connected' && <span className="status-dot connected">✅ Signed in</span>}
                                        </span>
                                        {status === 'waiting' && (
                                            <button
                                                className="reconnect-btn"
                                                onClick={() => window.open(p.url, `vektr_${p.id}`, 'width=900,height=700')}
                                            >
                                                Open ↗
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="connect-progress">
                            <div
                                className="connect-progress-bar"
                                style={{ width: `${selectedProviders.length > 0 ? (connectedCount / selectedProviders.length) * 100 : 0}%` }}
                            />
                        </div>
                        <div className="connect-progress-label">
                            {connectedCount} / {selectedProviders.length} signed in
                        </div>

                        <div className="onboarding-actions">
                            <button className="onboarding-primary" onClick={() => setStep(3)}>
                                {connectedCount >= selectedProviders.length ? 'All done! Continue →' : 'Continue anyway →'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Step 3: Done ──────────────────────────────── */}
                {step === 3 && (
                    <div className="onboarding-step">
                        <div className="onboarding-logo">🎉</div>
                        <h2 className="onboarding-title">You're all set!</h2>
                        <p className="onboarding-sub">
                            {connectedCount > 0
                                ? `${connectedCount} AI ${connectedCount === 1 ? 'chatbot' : 'chatbots'} ready to use.`
                                : 'Open your AI chatbot tabs anytime and start coding.'
                            }
                        </p>
                        <div className="onboarding-checklist">
                            <div className="check-item">✅ Click <strong>Open Folder</strong> to load your project</div>
                            <div className="check-item">✅ Select a file to edit in the Explorer</div>
                            <div className="check-item">✅ Ask AI in the Chat panel — prompt copies to clipboard</div>
                            <div className="check-item">✅ Paste response back with one click</div>
                        </div>
                        <div className="onboarding-actions">
                            <button className="onboarding-primary" onClick={finish}>
                                Open Vektr Prism →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
