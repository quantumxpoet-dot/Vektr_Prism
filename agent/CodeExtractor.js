/**
 * VektrIDE — Code Extractor
 * 
 * Parses AI responses, extracts code blocks with file paths
 */

export class CodeExtractor {
    constructor() {
        this.patterns = {
            // Match: ```js filename.js or ```javascript:src/app.js
            codeBlock: /```(\w*:)?([^\n`]+)?\n([\s\S]*?)```/g,
            // Match: File: path/to/file.js or // File: filename.js
            filePath: /(?:file|filename)[:\s]+([^\n]+)/gi,
            // Match standard code blocks without file hints
            simpleBlock: /```(\w+)?\n([\s\S]*?)```/g,
        };
    }

    /**
     * Extract code changes from AI response
     */
    extract(response) {
        const changes = [];
        
        // Try to extract code blocks with file paths first
        const withPaths = this.extractWithFilePaths(response);
        if (withPaths.length > 0) {
            return withPaths;
        }

        // Fall back to simple code blocks
        return this.extractSimpleBlocks(response);
    }

    /**
     * Extract code blocks that have file path hints
     */
    extractWithFilePaths(response) {
        const changes = [];
        const lines = response.split('\n');
        let currentFile = null;
        let currentCode = [];
        let inCodeBlock = false;
        let codeLanguage = '';

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Check for file path hint before code block
            const fileMatch = line.match(this.patterns.filePath);
            if (fileMatch && !inCodeBlock) {
                currentFile = fileMatch[1].trim();
                continue;
            }

            // Check for code block start
            const codeStartMatch = line.match(/^```(\w*:)?([^\n`]+)?/);
            if (codeStartMatch) {
                inCodeBlock = true;
                codeLanguage = codeStartMatch[1] || codeStartMatch[2] || '';
                
                // If the code block has a path in it (e.g., ```js:src/app.js)
                if (codeStartMatch[2] && codeStartMatch[2].includes('.')) {
                    currentFile = codeStartMatch[2].trim();
                }
                
                continue;
            }

            // Check for code block end
            if (line === '```' && inCodeBlock) {
                inCodeBlock = false;
                
                if (currentFile && currentCode.length > 0) {
                    changes.push({
                        filePath: currentFile,
                        code: currentCode.join('\n'),
                        language: codeLanguage.replace(':', '').trim(),
                    });
                }
                
                currentFile = null;
                currentCode = [];
                codeLanguage = '';
                continue;
            }

            // Collect code lines
            if (inCodeBlock) {
                currentCode.push(line);
            }
        }

        return changes;
    }

    /**
     * Extract simple code blocks without file path hints
     */
    extractSimpleBlocks(response) {
        const changes = [];
        let match;

        // Reset regex state
        this.patterns.simpleBlock.lastIndex = 0;

        while ((match = this.patterns.simpleBlock.exec(response)) !== null) {
            const language = match[1] || '';
            const code = match[2];

            // Try to infer file path from language
            const filePath = this.inferFilePath(language, code);

            changes.push({
                filePath: filePath,
                code: code,
                language: language,
            });
        }

        return changes;
    }

    /**
     * Infer file path from language and code content
     */
    inferFilePath(language, code) {
        const extensions = {
            'js': '.js',
            'javascript': '.js',
            'ts': '.ts',
            'typescript': '.ts',
            'jsx': '.jsx',
            'tsx': '.tsx',
            'python': '.py',
            'py': '.py',
            'go': '.go',
            'rs': '.rs',
            'rust': '.rs',
            'java': '.java',
            'php': '.py',
            'rb': '.rb',
            'ruby': '.rb',
            'c': '.c',
            'cpp': '.cpp',
            'c++': '.cpp',
            'cs': '.cs',
            'csharp': '.cs',
            'css': '.css',
            'scss': '.scss',
            'html': '.html',
            'json': '.json',
            'yaml': '.yaml',
            'yml': '.yml',
            'md': '.md',
            'markdown': '.md',
            'sql': '.sql',
            'sh': '.sh',
            'bash': '.sh',
            'zsh': '.sh',
            'ps1': '.ps1',
        };

        const ext = extensions[language.toLowerCase()] || '.txt';

        // Look for common patterns in code to suggest filename
        if (code.includes('export default') || code.includes('module.exports')) {
            return `index${ext}`;
        }
        
        if (code.includes('component') || code.includes('Component')) {
            return `Component${ext}`;
        }

        if (code.includes('function') || code.includes('const ') || code.includes('let ')) {
            return `utils${ext}`;
        }

        return `file${ext}`;
    }

    /**
     * Extract just the text (non-code) from response
     */
    extractText(response) {
        // Remove all code blocks
        const text = response.replace(/```[\s\S]*?```/g, '');
        return text.trim();
    }

    /**
     * Check if response contains code blocks
     */
    hasCodeBlocks(response) {
        return this.patterns.simpleBlock.test(response);
    }

    /**
     * Extract diff/patch format
     */
    extractDiff(response) {
        const diffs = [];
        const diffPattern = /diff --git a\/([^\s]+) b\/([^\s]+)\n([\s\S]*?)(?=\ndiff --git|$)/g;
        let match;

        while ((match = diffPattern.exec(response)) !== null) {
            diffs.push({
                filePath: match[1],
                diffContent: match[3],
            });
        }

        return diffs;
    }
}
