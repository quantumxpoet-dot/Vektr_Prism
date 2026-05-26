/**
 * VektrIDE Agent — Task Runner
 * 
 * Executes shell commands (tests, lint, build) and captures output.
 * Auto-detects the project's test/lint runner from package.json.
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export class TaskRunner {
    constructor(projectDir) {
        this.projectDir = path.resolve(projectDir);
        this.history = []; // { command, exitCode, stdout, stderr, durationMs }
    }

    /**
     * Run a command synchronously with timeout.
     * @param {string} command - Shell command to run
     * @param {number} timeoutMs - Timeout in ms (default 30s)
     * @returns {{ exitCode: number, stdout: string, stderr: string, durationMs: number }}
     */
    run(command, timeoutMs = 30000) {
        const start = Date.now();
        let result;

        try {
            const output = execSync(command, {
                cwd: this.projectDir,
                timeout: timeoutMs,
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe'],
                shell: true,
                env: { ...process.env, FORCE_COLOR: '0' }, // disable color codes
            });
            result = {
                exitCode: 0,
                stdout: output || '',
                stderr: '',
                durationMs: Date.now() - start,
            };
        } catch (e) {
            result = {
                exitCode: e.status || 1,
                stdout: e.stdout || '',
                stderr: e.stderr || e.message || '',
                durationMs: Date.now() - start,
            };
        }

        this.history.push({ command, ...result });
        return result;
    }

    /**
     * Run a command asynchronously with streaming output.
     * @param {string} command
     * @param {function} onData - Callback for each output chunk
     * @returns {Promise<{ exitCode: number, stdout: string, stderr: string }>}
     */
    runAsync(command, onData = null) {
        return new Promise((resolve) => {
            const start = Date.now();
            let stdout = '';
            let stderr = '';

            const proc = spawn(command, {
                cwd: this.projectDir,
                shell: true,
                env: { ...process.env, FORCE_COLOR: '0' },
            });

            proc.stdout.on('data', (data) => {
                const text = data.toString();
                stdout += text;
                if (onData) onData('stdout', text);
            });

            proc.stderr.on('data', (data) => {
                const text = data.toString();
                stderr += text;
                if (onData) onData('stderr', text);
            });

            proc.on('close', (code) => {
                const result = { exitCode: code || 0, stdout, stderr, durationMs: Date.now() - start };
                this.history.push({ command, ...result });
                resolve(result);
            });

            proc.on('error', (e) => {
                const result = { exitCode: 1, stdout, stderr: e.message, durationMs: Date.now() - start };
                this.history.push({ command, ...result });
                resolve(result);
            });
        });
    }

    /** Auto-detect and run the project's test suite */
    runTests() {
        const runner = this._detectRunner('test');
        if (!runner) {
            return { exitCode: -1, stdout: '', stderr: 'No test runner detected', durationMs: 0 };
        }
        console.log(`  🧪 Running tests: ${runner}`);
        return this.run(runner, 60000);
    }

    /** Auto-detect and run the project's linter */
    runLint() {
        const runner = this._detectRunner('lint');
        if (!runner) {
            return { exitCode: -1, stdout: '', stderr: 'No linter detected', durationMs: 0 };
        }
        console.log(`  🔍 Running lint: ${runner}`);
        return this.run(runner, 30000);
    }

    /** Run a build */
    runBuild() {
        const runner = this._detectRunner('build');
        if (!runner) {
            return { exitCode: -1, stdout: '', stderr: 'No build script detected', durationMs: 0 };
        }
        console.log(`  🔨 Running build: ${runner}`);
        return this.run(runner, 120000);
    }

    /** Detect script from package.json */
    _detectRunner(scriptName) {
        const pkgPath = path.join(this.projectDir, 'package.json');
        if (fs.existsSync(pkgPath)) {
            try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                if (pkg.scripts && pkg.scripts[scriptName]) {
                    return `npm run ${scriptName}`;
                }
            } catch { }
        }

        // Python fallback
        if (scriptName === 'test') {
            if (fs.existsSync(path.join(this.projectDir, 'pytest.ini')) ||
                fs.existsSync(path.join(this.projectDir, 'setup.py'))) {
                return 'python -m pytest';
            }
        }

        return null;
    }

    /** Get last N results */
    getHistory(n = 5) {
        return this.history.slice(-n);
    }
}

export default TaskRunner;
