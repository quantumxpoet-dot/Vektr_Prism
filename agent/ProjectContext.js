/**
 * VektrIDE Agent — Project Context Engine
 * 
 * Scans a project directory and builds a structured map for AI context injection.
 * Respects .gitignore patterns, skips binary files and node_modules.
 */

import fs from 'fs';
import path from 'path';

const SKIP_DIRS = new Set([
    'node_modules', '.git', '.svn', 'dist', 'build', '__pycache__',
    '.next', '.nuxt', '.cache', 'coverage', '.vscode', '.idea',
]);

const SKIP_EXTENSIONS = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp',
    '.mp3', '.mp4', '.avi', '.mov', '.wav',
    '.zip', '.tar', '.gz', '.rar', '.7z',
    '.exe', '.dll', '.so', '.dylib', '.bin',
    '.woff', '.woff2', '.ttf', '.eot',
    '.pdf', '.doc', '.docx', '.xls',
    '.lock', '.map',
]);

const MAX_FILE_SIZE = 100 * 1024; // 100KB — skip larger files
const MAX_FILES = 200;            // Cap to avoid overwhelming context

export class ProjectContext {
    constructor(projectDir) {
        this.projectDir = path.resolve(projectDir);
        this.fileTree = [];
        this.gitignorePatterns = [];
    }

    /** Scan the project and build the file tree */
    scan() {
        this.fileTree = [];
        this._loadGitignore();
        this._walk(this.projectDir, 0);
        return this;
    }

    _loadGitignore() {
        const giPath = path.join(this.projectDir, '.gitignore');
        if (fs.existsSync(giPath)) {
            this.gitignorePatterns = fs.readFileSync(giPath, 'utf8')
                .split('\n')
                .map(l => l.trim())
                .filter(l => l && !l.startsWith('#'));
        }
    }

    _shouldSkip(name, isDir) {
        if (isDir && SKIP_DIRS.has(name)) return true;
        if (!isDir && SKIP_EXTENSIONS.has(path.extname(name).toLowerCase())) return true;
        if (name.startsWith('.')) return true;
        // Simple gitignore check (exact name match)
        if (this.gitignorePatterns.includes(name)) return true;
        if (isDir && this.gitignorePatterns.includes(name + '/')) return true;
        return false;
    }

    _walk(dir, depth) {
        if (depth > 8 || this.fileTree.length >= MAX_FILES) return;

        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        } catch {
            return;
        }

        for (const entry of entries) {
            if (this.fileTree.length >= MAX_FILES) break;
            if (this._shouldSkip(entry.name, entry.isDirectory())) continue;

            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(this.projectDir, fullPath);

            if (entry.isDirectory()) {
                this.fileTree.push({ name: entry.name, path: fullPath, relative: relativePath, type: 'dir', depth });
                this._walk(fullPath, depth + 1);
            } else {
                try {
                    const stat = fs.statSync(fullPath);
                    if (stat.size <= MAX_FILE_SIZE) {
                        this.fileTree.push({
                            name: entry.name,
                            path: fullPath,
                            relative: relativePath,
                            type: 'file',
                            size: stat.size,
                            ext: path.extname(entry.name).replace('.', ''),
                            depth,
                        });
                    }
                } catch { }
            }
        }
    }

    /** Get a compact summary string suitable for AI context */
    getSummary() {
        const files = this.fileTree.filter(f => f.type === 'file');
        const dirs = this.fileTree.filter(f => f.type === 'dir');

        let summary = `Project: ${this.projectDir}\n`;
        summary += `Files: ${files.length}, Directories: ${dirs.length}\n\n`;
        summary += `File tree:\n`;

        for (const item of this.fileTree) {
            const indent = '  '.repeat(item.depth);
            if (item.type === 'dir') {
                summary += `${indent}📁 ${item.name}/\n`;
            } else {
                summary += `${indent}📄 ${item.relative} (${formatSize(item.size)})\n`;
            }
        }
        return summary;
    }

    /** Find files likely relevant to a given task description */
    getRelevantFiles(taskDescription, maxFiles = 10) {
        const keywords = taskDescription.toLowerCase()
            .split(/[\s,.\-_/\\]+/)
            .filter(w => w.length > 2);

        const scored = this.fileTree
            .filter(f => f.type === 'file')
            .map(f => {
                let score = 0;
                const nameLower = f.name.toLowerCase();
                const relLower = f.relative.toLowerCase();

                for (const kw of keywords) {
                    if (nameLower.includes(kw)) score += 3;
                    if (relLower.includes(kw)) score += 1;
                }

                // Boost config/entry files
                if (['package.json', 'tsconfig.json', 'vite.config.js', 'index.js', 'main.js', 'app.js'].includes(f.name)) {
                    score += 2;
                }
                // Boost source files
                if (['js', 'jsx', 'ts', 'tsx', 'py', 'rs', 'go'].includes(f.ext)) {
                    score += 1;
                }
                return { ...f, score };
            })
            .filter(f => f.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, maxFiles);

        return scored;
    }

    /** Read multiple files and return their contents */
    readFiles(filePaths) {
        const results = [];
        for (const fp of filePaths) {
            try {
                const content = fs.readFileSync(fp, 'utf8');
                const relative = path.relative(this.projectDir, fp);
                results.push({ path: fp, relative, content });
            } catch (e) {
                results.push({ path: fp, relative: fp, content: `[Error reading: ${e.message}]` });
            }
        }
        return results;
    }

    /** Format multiple files into a context block for AI prompts */
    formatFilesForPrompt(files) {
        return files.map(f =>
            `--- ${f.relative} ---\n\`\`\`\n${f.content}\n\`\`\``
        ).join('\n\n');
    }
}

function formatSize(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}K`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}

export default ProjectContext;
