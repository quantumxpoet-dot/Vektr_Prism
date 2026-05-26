import { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar.jsx';
import Editor from './components/Editor.jsx';
import AskAIBar from './components/AskAIBar.jsx';
import TerminalPanel from './components/TerminalPanel.jsx';

const API = '/api';

export default function App() {
    // File state
    const [currentFile, setCurrentFile] = useState(null);     // { path, content, extension }
    const [currentDir, setCurrentDir] = useState('C:\\');

    // AI state
    const [aiResponse, setAiResponse] = useState('');
    const [aiProvider, setAiProvider] = useState('');
    const [isAsking, setIsAsking] = useState(false);

    // Toast
    const [toast, setToast] = useState(null);

    const showToast = useCallback((msg, type = 'info') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    // Load a file into the editor
    const openFile = useCallback(async (filePath) => {
        try {
            const res = await fetch(`${API}/file?path=${encodeURIComponent(filePath)}`);
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setCurrentFile({ path: data.path, content: data.content, extension: data.extension });
        } catch (e) {
            showToast(`Failed to open: ${e.message}`, 'error');
        }
    }, [showToast]);

    // Update content in state when user edits
    const onEditorChange = useCallback((value) => {
        setCurrentFile(prev => prev ? { ...prev, content: value } : null);
    }, []);

    // Ask AI
    const askAI = useCallback(async (prompt, providerId) => {
        if (!prompt.trim()) return;
        setIsAsking(true);
        setAiResponse('');
        setAiProvider(providerId);

        try {
            const res = await fetch(`${API}/ask-ai`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt,
                    code: currentFile?.content || '',
                    provider: providerId,
                    filePath: currentFile?.path || '',
                }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setAiResponse(data.response);
            setAiProvider(data.provider);
            showToast(`Response received from ${data.provider}`, 'success');
        } catch (e) {
            setAiResponse(`Error: ${e.message}`);
            showToast(e.message, 'error');
        } finally {
            setIsAsking(false);
        }
    }, [currentFile, showToast]);

    // Confirm change — save AI response to the current file
    const confirmChange = useCallback(async () => {
        if (!currentFile?.path || !aiResponse) return;

        try {
            const res = await fetch(`${API}/save-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: currentFile.path, content: aiResponse }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            // Update editor with the new content
            setCurrentFile(prev => ({ ...prev, content: aiResponse }));
            showToast(`Saved to ${data.path}`, 'success');
        } catch (e) {
            showToast(`Save failed: ${e.message}`, 'error');
        }
    }, [currentFile, aiResponse, showToast]);

    // Clear terminal
    const clearTerminal = useCallback(() => {
        setAiResponse('');
        setAiProvider('');
    }, []);

    return (
        <div className="ide-container">
            {/* Sidebar */}
            <Sidebar
                currentDir={currentDir}
                onDirChange={setCurrentDir}
                onFileSelect={openFile}
                activeFile={currentFile?.path}
            />

            {/* Main panel */}
            <div className="main-panel">
                {/* Tab bar */}
                <div className="tab-bar">
                    {currentFile && (
                        <div className="tab active">
                            <span>📄</span>
                            <span>{currentFile.path.split('\\').pop()}</span>
                        </div>
                    )}
                    {!currentFile && (
                        <div className="tab active">
                            <span>🏠</span>
                            <span>Welcome</span>
                        </div>
                    )}
                </div>

                {/* Editor */}
                <div className="editor-area">
                    <Editor
                        file={currentFile}
                        onChange={onEditorChange}
                    />
                </div>

                {/* Ask AI Bar */}
                <AskAIBar
                    onAsk={askAI}
                    isLoading={isAsking}
                    hasFile={!!currentFile}
                />

                {/* Terminal Panel */}
                <TerminalPanel
                    response={aiResponse}
                    provider={aiProvider}
                    isLoading={isAsking}
                    onConfirm={confirmChange}
                    onClear={clearTerminal}
                    canConfirm={!!aiResponse && !!currentFile}
                />

                {/* Status bar */}
                <div className="status-bar">
                    <div className="status-left">
                        <span>{currentFile ? currentFile.path : 'No file open'}</span>
                    </div>
                    <div className="status-right">
                        <span>{currentFile ? currentFile.extension.toUpperCase() : ''}</span>
                        <span>VektrIDE v1.0</span>
                    </div>
                </div>
            </div>

            {/* Toast */}
            {toast && (
                <div className={`toast ${toast.type}`}>
                    {toast.msg}
                </div>
            )}
        </div>
    );
}
