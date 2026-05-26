import MonacoEditor from '@monaco-editor/react';

// Map file extensions to Monaco language IDs
const LANG_MAP = {
    js: 'javascript', jsx: 'javascript', mjs: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    css: 'css', scss: 'scss', less: 'less',
    html: 'html', htm: 'html',
    json: 'json', jsonc: 'json',
    md: 'markdown',
    py: 'python',
    rs: 'rust',
    go: 'go',
    java: 'java',
    c: 'c', h: 'c',
    cpp: 'cpp', hpp: 'cpp', cc: 'cpp',
    cs: 'csharp',
    rb: 'ruby',
    php: 'php',
    sh: 'shell', bash: 'shell',
    bat: 'bat', cmd: 'bat',
    ps1: 'powershell',
    sql: 'sql',
    xml: 'xml',
    yaml: 'yaml', yml: 'yaml',
    toml: 'ini',
    txt: 'plaintext',
};

export default function Editor({ file, onChange }) {
    if (!file) {
        return (
            <div className="editor-placeholder">
                <div className="big-icon">⌨️</div>
                <div>Open a file from the sidebar to start editing</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Navigate to a project folder using the path input
                </div>
            </div>
        );
    }

    const language = LANG_MAP[file.extension] || 'plaintext';

    return (
        <MonacoEditor
            height="100%"
            language={language}
            value={file.content}
            onChange={onChange}
            theme="vs-dark"
            options={{
                fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
                fontSize: 13,
                lineHeight: 20,
                minimap: { enabled: true, scale: 1 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                renderLineHighlight: 'all',
                bracketPairColorization: { enabled: true },
                padding: { top: 10 },
                wordWrap: 'off',
                tabSize: 2,
                automaticLayout: true,
            }}
        />
    );
}
