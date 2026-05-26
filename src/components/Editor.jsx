import { useState, useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';

const LANG_MAP = {
    js: 'javascript', jsx: 'javascript', mjs: 'javascript',
    ts: 'typescript', tsx: 'typescript',
    css: 'css', scss: 'scss', less: 'less',
    html: 'html', htm: 'html',
    json: 'json', jsonc: 'json',
    md: 'markdown',
    py: 'python', rs: 'rust', go: 'go', java: 'java',
    c: 'c', h: 'c', cpp: 'cpp', hpp: 'cpp', cc: 'cpp',
    cs: 'csharp', rb: 'ruby', php: 'php',
    sh: 'shell', bash: 'shell', bat: 'bat', cmd: 'bat', ps1: 'powershell',
    sql: 'sql', xml: 'xml', yaml: 'yaml', yml: 'yaml', toml: 'ini',
    txt: 'plaintext',
};

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

export default function Editor({ file, onChange }) {
    const isMobile = useMobile();

    if (!file) {
        return (
            <div className="editor-placeholder">
                <div className="placeholder-icon">⌨️</div>
                <div className="placeholder-title">Open a file to start editing</div>
                <div className="placeholder-sub">Select a file from the explorer and ask AI anything</div>
            </div>
        );
    }

    const language = LANG_MAP[file.extension] || 'plaintext';

    // Mobile: use a plain textarea — Monaco's virtual keyboard handling is poor on phones
    if (isMobile) {
        return (
            <textarea
                className="mobile-editor"
                value={file.content}
                onChange={e => onChange(e.target.value)}
                spellCheck={false}
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect="off"
            />
        );
    }

    return (
        <MonacoEditor
            height="100%"
            language={language}
            value={file.content}
            onChange={onChange}
            theme="vs"
            options={{
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontSize: 13,
                lineHeight: 22,
                minimap: { enabled: true, scale: 1 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                renderLineHighlight: 'line',
                bracketPairColorization: { enabled: true },
                padding: { top: 16 },
                wordWrap: 'off',
                tabSize: 2,
                automaticLayout: true,
                lineDecorationsWidth: 8,
                lineNumbersMinChars: 4,
            }}
        />
    );
}
