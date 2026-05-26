import { useState, useEffect } from 'react';

const API = '/api';

export default function AskAIBar({ onAsk, isLoading, hasFile }) {
    const [prompt, setPrompt] = useState('');
    const [providers, setProviders] = useState([]);
    const [selectedProvider, setSelectedProvider] = useState('');

    // Load providers on mount
    useEffect(() => {
        fetch(`${API}/providers`)
            .then(r => r.json())
            .then(data => {
                setProviders(data.providers || []);
                // Default to first provider or auto-detect
                if (data.openTabs?.length > 0) {
                    setSelectedProvider(data.openTabs[0].providerId);
                } else if (data.providers?.length > 0) {
                    setSelectedProvider(data.providers[0].id);
                }
            })
            .catch(() => {
                // Server not running yet — show defaults
                setProviders([
                    { id: 'gemini', name: 'Google Gemini' },
                    { id: 'chatgpt', name: 'ChatGPT' },
                    { id: 'claude', name: 'Claude' },
                    { id: 'generic', name: 'Generic (Auto-detect)' },
                ]);
                setSelectedProvider('gemini');
            });
    }, []);

    const handleSubmit = () => {
        if (!prompt.trim() || isLoading) return;
        onAsk(prompt, selectedProvider);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="ask-ai-bar">
            <select
                className="provider-select"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
            >
                {providers.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                ))}
            </select>

            <input
                className="prompt-input"
                type="text"
                placeholder={hasFile
                    ? 'Ask AI about this file... (e.g. "refactor this function")'
                    : 'Ask AI anything...'
                }
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
            />

            <button
                className={`ask-btn ${isLoading ? 'loading' : ''}`}
                onClick={handleSubmit}
                disabled={isLoading || !prompt.trim()}
            >
                {isLoading ? (
                    <>⏳ Thinking...</>
                ) : (
                    <>🚀 Ask AI</>
                )}
            </button>
        </div>
    );
}
