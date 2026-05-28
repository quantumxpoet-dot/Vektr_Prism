/**
 * Vektr Prism — Task Runner
 * 
 * Executes shell commands (tests, lint, build)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export class TaskRunner {
    constructor(projectDir) {
        this.projectDir = projectDir;
    }

    /**
     * Run tests
     */
    async runTests() {
        const packageJson = this.readPackageJson();
        
        if (!packageJson) {
            return { success: false, output: 'No package.json found' };
        }

        const testScript = packageJson.scripts?.test;
        
        if (!testScript) {
            return { success: false, output: 'No test script found in package.json' };
        }

        try {
            const output = execSync(`npm test`, {
                cwd: this.projectDir,
                stdio: 'pipe',
                encoding: 'utf8',
                timeout: 60000, // 1 minute timeout
            });

            return { success: true, output };
        } catch (e) {
            return { 
                success: false, 
                output: e.stdout || e.stderr || e.message 
            };
        }
    }

    /**
     * Run linting
     */
    async runLint() {
        const packageJson = this.readPackageJson();
        
        if (!packageJson) {
            return { success: false, output: 'No package.json found' };
        }

        const lintScript = packageJson.scripts?.lint;
        
        if (!lintScript) {
            return { success: false, output: 'No lint script found in package.json' };
        }

        try {
            const output = execSync(`npm run lint`, {
                cwd: this.projectDir,
                stdio: 'pipe',
                encoding: 'utf8',
                timeout: 60000,
            });

            return { success: true, output };
        } catch (e) {
            return { 
                success: false, 
                output: e.stdout || e.stderr || e.message 
            };
        }
    }

    /**
     * Run build
     */
    async runBuild() {
        const packageJson = this.readPackageJson();
        
        if (!packageJson) {
            return { success: false, output: 'No package.json found' };
        }

        const buildScript = packageJson.scripts?.build;
        
        if (!buildScript) {
            return { success: false, output: 'No build script found in package.json' };
        }

        try {
            const output = execSync(`npm run build`, {
                cwd: this.projectDir,
                stdio: 'pipe',
                encoding: 'utf8',
                timeout: 120000, // 2 minute timeout
            });

            return { success: true, output };
        } catch (e) {
            return { 
                success: false, 
                output: e.stdout || e.stderr || e.message 
            };
        }
    }

    /**
     * Run custom command
     */
    async runCommand(command, timeout = 60000) {
        try {
            const output = execSync(command, {
                cwd: this.projectDir,
                stdio: 'pipe',
                encoding: 'utf8',
                timeout,
            });

            return { success: true, output };
        } catch (e) {
            return { 
                success: false, 
                output: e.stdout || e.stderr || e.message 
            };
        }
    }

    /**
     * Check if a file exists
     */
    fileExists(filePath) {
        const fullPath = path.join(this.projectDir, filePath);
        return fs.existsSync(fullPath);
    }

    /**
     * Read file content
     */
    readFile(filePath) {
        const fullPath = path.join(this.projectDir, filePath);
        
        if (!fs.existsSync(fullPath)) {
            return null;
        }

        try {
            return fs.readFileSync(fullPath, 'utf8');
        } catch (e) {
            return null;
        }
    }

    /**
     * Write file content
     */
    writeFile(filePath, content) {
        const fullPath = path.join(this.projectDir, filePath);
        const dir = path.dirname(fullPath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        try {
            fs.writeFileSync(fullPath, content, 'utf8');
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    }

    /**
     * Read package.json
     */
    readPackageJson() {
        const packagePath = path.join(this.projectDir, 'package.json');
        
        if (!fs.existsSync(packagePath)) {
            return null;
        }

        try {
            const content = fs.readFileSync(packagePath, 'utf8');
            return JSON.parse(content);
        } catch (e) {
            return null;
        }
    }

    /**
     * Get available npm scripts
     */
    getScripts() {
        const packageJson = this.readPackageJson();
        return packageJson?.scripts || {};
    }

    /**
     * Check if project has dependencies installed
     */
    hasDependencies() {
        const nodeModulesPath = path.join(this.projectDir, 'node_modules');
        return fs.existsSync(nodeModulesPath);
    }

    /**
     * Install dependencies
     */
    async installDependencies() {
        try {
            const output = execSync(`npm install`, {
                cwd: this.projectDir,
                stdio: 'pipe',
                encoding: 'utf8',
                timeout: 300000, // 5 minute timeout
            });

            return { success: true, output };
        } catch (e) {
            return { 
                success: false, 
                output: e.stdout || e.stderr || e.message 
            };
        }
    }

    /**
     * Run git status
     */
    async gitStatus() {
        try {
            const output = execSync(`git status`, {
                cwd: this.projectDir,
                stdio: 'pipe',
                encoding: 'utf8',
                timeout: 10000,
            });

            return { success: true, output };
        } catch (e) {
            return { 
                success: false, 
                output: e.stdout || e.stderr || e.message 
            };
        }
    }

    /**
     * Run git diff
     */
    async gitDiff(filePath = null) {
        try {
            const command = filePath ? `git diff ${filePath}` : 'git diff';
            const output = execSync(command, {
                cwd: this.projectDir,
                stdio: 'pipe',
                encoding: 'utf8',
                timeout: 10000,
            });

            return { success: true, output };
        } catch (e) {
            return { 
                success: false, 
                output: e.stdout || e.stderr || e.message 
            };
        }
    }

    /**
     * Run git add
     */
    async gitAdd(files = '.') {
        try {
            const output = execSync(`git add ${files}`, {
                cwd: this.projectDir,
                stdio: 'pipe',
                encoding: 'utf8',
                timeout: 10000,
            });

            return { success: true, output };
        } catch (e) {
            return { 
                success: false, 
                output: e.stdout || e.stderr || e.message 
            };
        }
    }

    /**
     * Run git commit
     */
    async gitCommit(message) {
        try {
            const output = execSync(`git commit -m "${message}"`, {
                cwd: this.projectDir,
                stdio: 'pipe',
                encoding: 'utf8',
                timeout: 30000,
            });

            return { success: true, output };
        } catch (e) {
            return { 
                success: false, 
                output: e.stdout || e.stderr || e.message 
            };
        }
    }
}
