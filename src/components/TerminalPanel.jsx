export default function TerminalPanel({ response, provider, isLoading, onConfirm, onClear, canConfirm }) {
    return (
        <div className="terminal-panel">
            <div className="terminal-header">
                <div className="terminal-title">
                    <span className="dot" style={
                        isLoading ? { background: 'var(--accent-warning)', boxShadow: '0 0 6px var(--accent-warning)' } :
                            response ? {} : { background: 'var(--text-muted)', boxShadow: 'none' }
                    } />
                    <span>
                        {isLoading ? 'AI Response (streaming...)' :
                            response ? `AI Response — ${provider}` : 'AI Response'}
                    </span>
                </div>
                <div className="terminal-actions">
                    <button
                        className="clear-btn"
                        onClick={onClear}
                        disabled={!response && !isLoading}
                    >
                        Clear
                    </button>
                    <button
                        className="confirm-btn"
                        onClick={onConfirm}
                        disabled={!canConfirm}
                        title="Save the AI response to the current file"
                    >
                        ✅ Confirm Change
                    </button>
                </div>
            </div>

            <div className="terminal-body">
                {!response && !isLoading && (
                    <span className="system-msg">
                        {'> Ready. Select a file, type a prompt, and click "Ask AI".\n'}
                        {'> The AI response will appear here.\n'}
                        {'> Click "Confirm Change" to save the result to your file.\n'}
                    </span>
                )}
                {isLoading && (
                    <span className="system-msg">
                        {'> Sending prompt to '}
                        <strong>{provider || 'AI'}</strong>
                        {'...\n> Waiting for response...\n'}
                    </span>
                )}
                {response && (
                    <span className={response.startsWith('Error:') ? 'error-msg' : 'response-text'}>
                        {response}
                    </span>
                )}
            </div>
        </div>
    );
}
