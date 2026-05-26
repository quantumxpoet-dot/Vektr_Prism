export default function TopNav({ viewMode, setViewMode, currentFile }) {
    const filename = currentFile?.path?.split('\\').pop() || null;

    return (
        <div className="top-nav">
            {/* Left: Logo + breadcrumb */}
            <div className="top-nav-left">
                <div className="nav-logo">
                    <div className="nav-logo-icon">V</div>
                    <span className="nav-logo-text">Vektr Prism</span>
                </div>
                {filename && (
                    <span className="nav-breadcrumb">
                        <span className="nav-sep">/</span>
                        {filename}
                    </span>
                )}
            </div>

            {/* Center: Mode toggle */}
            <div className="top-nav-center">
                <div className="nav-mode-toggle">
                    <button
                        className={`nav-mode-btn ${viewMode === 'manual' ? 'active' : ''}`}
                        onClick={() => setViewMode('manual')}
                    >
                        ⚡ Manual
                    </button>
                    <button
                        className={`nav-mode-btn ${viewMode === 'agent' ? 'active' : ''}`}
                        onClick={() => setViewMode('agent')}
                    >
                        🤖 Agent
                    </button>
                </div>
            </div>

            {/* Right: Icons */}
            <div className="top-nav-right">
                <button className="nav-icon-btn" title="Settings">⚙️</button>
                <button className="nav-icon-btn" title="Notifications">🔔</button>
                <div className="nav-avatar" title="Account">D</div>
            </div>
        </div>
    );
}
