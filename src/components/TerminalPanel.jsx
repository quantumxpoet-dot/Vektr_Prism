export default function TerminalPanel({ response, provider, isLoading, onConfirm, onClear, canConfirm }) {
    // Don't render anything until the user has asked something
    if (!response && !isLoading) return null;

    return (
        <div className="terminal-panel">
            <div className="terminal-header">
                <div className="terminal-title">
                    <span className="dot" style={
                        isLoading
                            ? { background: 'var(--accent-warning)', boxShadow: '0 0 6px var(--accent-warning)' }
                            : {}
                    } />
                    <span>
                        {isLoading ? 'Waiting for AI...' : `AI Response — ${provider}`}
                    </span>
                </div>
                <div className="terminal-actions">
                    <button className="clear-btn" onClick={onClear}>
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
                {isLoading && (
                    <span className="system-msg">
                        {'> Sending to '}<strong>{provider || 'AI'}</strong>{'...\n> Waiting for response...\n'}
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
