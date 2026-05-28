/**
 * Vektr Prism — Project Context Builder
 * 
 * Scans project directory, builds context for AI understanding
 */

import fs from 'fs';
import path from 'path';

export class ProjectContext {
    constructor(projectDir) {
        this.projectDir = projectDir;
        this.files = [];
        this.structure = {};
    }

    /**
     * Build context from project directory
     */
    async buildContext() {
        this.scanDirectory(this.projectDir);
        this.buildStructure();
        
        return {
            projectDir: this.projectDir,
            fileCount: this.files.length,
            structure: this.structure,
            keyFiles: this.identifyKeyFiles(),
            packageInfo: this.readPackageInfo(),
            techStack: this.identifyTechStack(),
        };
    }

    /**
     * Recursively scan directory for files
     */
    scanDirectory(dir, relativePath = '') {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            // Skip node_modules, .git, dist, build
            if (
                entry.name === 'node_modules' ||
                entry.name === '.git' ||
                entry.name === 'dist' ||
                entry.name === 'build' ||
                entry.name === '.next' ||
                entry.name === 'coverage' ||
                entry.name.startsWith('.')
            ) {
                continue;
            }

            const fullPath = path.join(dir, entry.name);
            const relPath = path.join(relativePath, entry.name);

            if (entry.isDirectory()) {
                this.scanDirectory(fullPath, relPath);
            } else if (entry.isFile()) {
                this.files.push({
                    path: relPath,
                    fullPath: fullPath,
                    extension: path.extname(entry.name),
                    size: fs.statSync(fullPath).size,
                });
            }
        }
    }

    /**
     * Build directory structure tree
     */
    buildStructure() {
        this.structure = this.buildTree(this.files);
    }

    buildTree(files) {
        const tree = {};

        for (const file of files) {
            const parts = file.path.split(path.sep);
            let current = tree;

            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                const isFile = i === parts.length - 1;

                if (!current[part]) {
                    current[part] = isFile ? { __file: true, ...file } : {};
                }

                if (!isFile) {
                    current = current[part];
                }
            }
        }

        return tree;
    }

    /**
     * Identify key files (package.json, README, config files, main entry points)
     */
    identifyKeyFiles() {
        const keyFiles = [];
        const keyPatterns = [
            'package.json',
            'README.md',
            'tsconfig.json',
            '.env.example',
            'docker-compose.yml',
            'Dockerfile',
            'webpack.config.js',
            'vite.config.js',
            'next.config.js',
            '.eslintrc',
            '.prettierrc',
            'index.js',
            'index.ts',
            'main.js',
            'main.ts',
            'app.js',
            'app.ts',
            'server.js',
            'server.ts',
        ];

        for (const file of this.files) {
            const fileName = path.basename(file.path);
            if (keyPatterns.includes(fileName) || fileName.startsWith('config.')) {
                keyFiles.push(file);
            }
        }

        return keyFiles;
    }

    /**
     * Read package.json if it exists
     */
    readPackageInfo() {
        const packageFile = this.files.find(f => f.path === 'package.json');
        
        if (!packageFile) {
            return null;
        }

        try {
            const content = fs.readFileSync(packageFile.fullPath, 'utf8');
            return JSON.parse(content);
        } catch (e) {
            return null;
        }
    }

    /**
     * Identify tech stack from files and package.json
     */
    identifyTechStack() {
        const stack = {
            frameworks: [],
            languages: [],
            buildTools: [],
            testing: [],
        };

        // From file extensions
        const extensions = new Set(this.files.map(f => f.extension));
        if (extensions.has('.js')) stack.languages.push('JavaScript');
        if (extensions.has('.ts')) stack.languages.push('TypeScript');
        if (extensions.has('.jsx')) stack.frameworks.push('React');
        if (extensions.has('.tsx')) stack.frameworks.push('React (TypeScript)');
        if (extensions.has('.vue')) stack.frameworks.push('Vue');
        if (extensions.has('.svelte')) stack.frameworks.push('Svelte');
        if (extensions.has('.py')) stack.languages.push('Python');
        if (extensions.has('.go')) stack.languages.push('Go');
        if (extensions.has('.rs')) stack.languages.push('Rust');
        if (extensions.has('.java')) stack.languages.push('Java');
        if (extensions.has('.php')) stack.languages.push('PHP');

        // From package.json
        const pkg = this.readPackageInfo();
        if (pkg) {
            const deps = { ...pkg.dependencies, ...pkg.devDependencies };

            if (deps.react) stack.frameworks.push('React');
            if (deps.vue) stack.frameworks.push('Vue');
            if (deps['@angular/core']) stack.frameworks.push('Angular');
            if (deps.svelte) stack.frameworks.push('Svelte');
            if (deps.next) stack.frameworks.push('Next.js');
            if (deps.nuxt) stack.frameworks.push('Nuxt.js');
            if (deps.express) stack.frameworks.push('Express');
            if (deps.fastify) stack.frameworks.push('Fastify');
            if (deps.koa) stack.frameworks.push('Koa');
            if (deps.vite) stack.buildTools.push('Vite');
            if (deps.webpack) stack.buildTools.push('Webpack');
            if (deps.rollup) stack.buildTools.push('Rollup');
            if (deps.esbuild) stack.buildTools.push('esbuild');
            if (deps.jest) stack.testing.push('Jest');
            if (deps.vitest) stack.testing.push('Vitest');
            if (deps.mocha) stack.testing.push('Mocha');
            if (deps['@testing-library']) stack.testing.push('Testing Library');
            if (deps.cypress) stack.testing.push('Cypress');
            if (deps.playwright) stack.testing.push('Playwright');
        }

        return stack;
    }

    /**
     * Get file content for context
     */
    getFileContent(filePath, maxLines = 100) {
        const file = this.files.find(f => f.path === filePath);
        
        if (!file) {
            return null;
        }

        try {
            const content = fs.readFileSync(file.fullPath, 'utf8');
            const lines = content.split('\n');
            
            if (lines.length > maxLines) {
                return lines.slice(0, maxLines).join('\n') + '\n\n... (truncated)';
            }

            return content;
        } catch (e) {
            return null;
        }
    }

    /**
     * Get relevant files based on a query (simple keyword matching)
     */
    getRelevantFiles(query, limit = 10) {
        const keywords = query.toLowerCase().split(/\s+/);
        
        const scored = this.files.map(file => {
            const fileName = file.path.toLowerCase();
            let score = 0;

            for (const keyword of keywords) {
                if (fileName.includes(keyword)) score += 10;
                if (file.extension === `.${keyword}`) score += 5;
            }

            return { ...file, score };
        });

        const sorted = scored.filter(f => f.score > 0).sort((a, b) => b.score - a.score);
        return sorted.slice(0, limit);
    }
}
