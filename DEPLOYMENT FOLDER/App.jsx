import { useState, useEffect } from 'react'
import OnboardingWizard from './components/OnboardingWizard'
import ChatPanel from './components/ChatPanel'
import { restoreFolder, listDir, readFile, writeFile } from './lib/fileSystem'
import { askAI, readClipboardResponse } from './lib/aiBridge'
import './App.css'

export default function App() {
    const [onboardingDone, setOnboardingDone] = useState(
        () => localStorage.getItem('vektr_onboarding_done') === 'true'
    )
    const [folderHandle, setFolderHandle] = useState(null)
    const [currentFile, setCurrentFile] = useState(null)
    const [fileTree, setFileTree] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [pendingResponse, setPendingResponse] = useState(null)

    // On mount: restore folder if available
    useEffect(() => {
        const restorePreviousFolder = async () => {
            const folder = await restoreFolder()
            if (folder) {
                setFolderHandle(folder.handle)
                await refreshFileTree(folder.handle)
            }
        }
        if (onboardingDone) {
            restorePreviousFolder()
        }
    }, [onboardingDone])

    const handleOnboardingComplete = (providers) => {
        setOnboardingDone(true)
        localStorage.setItem('vektr_onboarding_done', 'true')
    }

    const refreshFileTree = async (handle) => {
        try {
            const items = await listDir(handle)
            setFileTree(items)
        } catch (err) {
            console.error('Failed to list directory:', err)
        }
    }

    const openFile = async (fileHandle) => {
        try {
            const content = await readFile(fileHandle)
            setCurrentFile({
                handle: fileHandle,
                path: content.name,
                content: content.content,
                size: content.size,
                lastModified: content.lastModified
            })
        } catch (err) {
            console.error('Failed to open file:', err)
        }
    }

    const handleAskAI = async (prompt, providerId) => {
        setIsLoading(true)
        try {
            const result = await askAI(prompt, providerId)
            
            if (result.mode === 'clipboard') {
                // Clipboard mode: show banner, wait for user to paste response
                setPendingResponse({
                    providerId,
                    message: result.message
                })
                return null // Signal that we're in clipboard mode
            } else if (result.mode === 'api') {
                // API mode: response came back directly
                return result.response
            }
        } catch (err) {
            console.error('Ask AI failed:', err)
            return null
        } finally {
            setIsLoading(false)
        }
    }

    const handlePasteResponse = async () => {
        try {
            const response = await readClipboardResponse()
            setPendingResponse(null)
            return response
        } catch (err) {
            console.error('Failed to read clipboard:', err)
            return null
        }
    }

    const handleConfirmChange = async (content) => {
        if (!currentFile?.handle) return
        try {
            await writeFile(currentFile.handle, content)
            setCurrentFile(prev => ({
                ...prev,
                content
            }))
        } catch (err) {
            console.error('Failed to save file:', err)
        }
    }

    if (!onboardingDone) {
        return <OnboardingWizard onComplete={handleOnboardingComplete} />
    }

    return (
        <div className="vektr-app">
            <div className="app-layout">
                {/* Sidebar */}
                <div className="sidebar">
                    <div className="sidebar-header">
                        <div className="app-logo">🔮</div>
                        <div className="app-title">Vektr Prism</div>
                    </div>

                    {folderHandle ? (
                        <div className="file-explorer">
                            <div className="explorer-label">FILES</div>
                            <div className="file-tree">
                                {fileTree.map((item, idx) => (
                                    <div key={idx} className={`tree-item ${item.type}`}>
                                        {item.type === 'directory' ? '📁' : '📄'}
                                        {item.type === 'file' ? (
                                            <button
                                                className="file-button"
                                                onClick={() => openFile(item.handle)}
                                            >
                                                {item.name}
                                            </button>
                                        ) : (
                                            <span>{item.name}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="no-folder">
                            <div className="no-folder-icon">📁</div>
                            <div className="no-folder-text">No folder open</div>
                            <button
                                className="open-folder-btn"
                                onClick={async () => {
                                    try {
                                        const { showDirectoryPicker } = window
                                        if (!showDirectoryPicker) {
                                            alert('File System Access API not supported in your browser')
                                            return
                                        }
                                        const handle = await showDirectoryPicker({ mode: 'readwrite' })
                                        setFolderHandle(handle)
                                        await refreshFileTree(handle)
                                    } catch (err) {
                                        console.error('Failed to open folder:', err)
                                    }
                                }}
                            >
                                Open Folder
                            </button>
                        </div>
                    )}
                </div>

                {/* Editor area */}
                <div className="editor-area">
                    {currentFile ? (
                        <div className="file-editor">
                            <div className="editor-tab">{currentFile.path}</div>
                            <textarea
                                className="editor-content"
                                value={currentFile.content}
                                onChange={(e) => setCurrentFile(prev => ({
                                    ...prev,
                                    content: e.target.value
                                }))}
                                placeholder="Open a file to edit"
                            />
                        </div>
                    ) : (
                        <div className="editor-empty">
                            <div className="empty-icon">📝</div>
                            <div className="empty-text">Open a file to start editing</div>
                        </div>
                    )}
                </div>

                {/* Chat panel */}
                <ChatPanel
                    currentFile={currentFile}
                    onAsk={handleAskAI}
                    onConfirm={handleConfirmChange}
                    onPasteResponse={handlePasteResponse}
                    pendingResponse={pendingResponse}
                    isLoading={isLoading}
                />
            </div>
        </div>
    )
}
