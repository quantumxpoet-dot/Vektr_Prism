/**
 * VektrIDE Agent — Controller (Orchestrator)
 * 
 * Manages the full agentic loop: PLAN → EXECUTE → VERIFY → ITERATE.
 * Emits events for live UI updates via SSE.
 */

import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import { ProjectContext } from './ProjectContext.js';
import { extractCodeBlocks, parsePlan } from './CodeExtractor.js';
import { TaskRunner } from './TaskRunner.js';
import { planPrompt, executePrompt, fixPrompt } from './prompts.js';

const MAX_RETRIES = 3;

/**
 * @typedef {'idle'|'planning'|'executing'|'verifying'|'iterating'|'waiting'|'complete'|'failed'|'aborted'} AgentState
 */

export class AgentController extends EventEmitter {
    constructor(bridge) {
        super();
        this.bridge = bridge;        // IDEBridge instance
        this.state = 'idle';
        this.mode = 'supervised';    // 'supervised' | 'autonomous'
        this.providerId = null;

        // Task state
        this.goal = '';
        this.projectDir = '';
        this.context = null;         // ProjectContext
        this.runner = null;          // TaskRunner
        this.plan = [];              // parsed plan steps
        this.currentStep = -1;
        this.stepResults = [];       // { step, status, filesChanged, response, error }
        this.retryCount = 0;

        // Logs
        this.log = [];               // { timestamp, type, message }
    }

    _log(type, message) {
        const entry = { timestamp: new Date().toISOString(), type, message };
        this.log.push(entry);
        this.emit('log', entry);
        console.log(`  [Agent/${type}] ${message}`);
    }

    _setState(newState) {
        this.state = newState;
        this.emit('state', { state: newState, step: this.currentStep, total: this.plan.length });
    }

    /** Get the current status snapshot for the API */
    getStatus() {
        return {
            state: this.state,
            mode: this.mode,
            goal: this.goal,
            projectDir: this.projectDir,
            providerId: this.providerId,
            plan: this.plan,
            currentStep: this.currentStep,
            totalSteps: this.plan.length,
            stepResults: this.stepResults,
            log: this.log.slice(-50),
        };
    }

    /**
     * Start a new agentic task.
     * @param {string} goal - High-level task description
     * @param {string} projectDir - Absolute path to project
     * @param {'supervised'|'autonomous'} mode
     * @param {string} providerId - AI provider to use
     */
    async startTask(goal, projectDir, mode = 'supervised', providerId = null) {
        // Reset state
        this.goal = goal;
        this.projectDir = path.resolve(projectDir);
        this.mode = mode;
        this.providerId = providerId;
        this.plan = [];
        this.currentStep = -1;
        this.stepResults = [];
        this.retryCount = 0;
        this.log = [];

        // Initialize context + runner
        this.context = new ProjectContext(this.projectDir);
        this.context.scan();
        this.runner = new TaskRunner(this.projectDir);

        this._log('system', `Task started: "${goal}"`);
        this._log('system', `Project: ${this.projectDir} (${this.context.fileTree.length} files)`);
        this._log('system', `Mode: ${mode}, Provider: ${providerId || 'auto-detect'}`);

        // Auto-detect provider if not specified
        if (!this.providerId) {
            const detected = this.bridge.detectProvider();
            this.providerId = detected ? detected.providerId : 'generic';
            this._log('system', `Auto-detected provider: ${this.providerId}`);
        }

        // PHASE 1: PLAN
        await this._planPhase();
    }

    /** PLAN phase — send project context + goal to AI, get a step list */
    async _planPhase() {
        this._setState('planning');
        this._log('plan', 'Generating plan from AI...');

        const projectSummary = this.context.getSummary();
        const prompt = planPrompt(projectSummary, this.goal);

        try {
            const response = await this.bridge.askAI(this.providerId, prompt);
            this._log('plan', `Plan response received (${response.length} chars)`);

            // Parse the plan
            this.plan = parsePlan(response);
            if (this.plan.length === 0) {
                this._log('error', 'Failed to parse plan from AI response. Raw response stored.');
                this.plan = [{ stepNumber: 1, description: response.substring(0, 500), files: [] }];
            }

            this._log('plan', `Plan has ${this.plan.length} steps:`);
            for (const step of this.plan) {
                this._log('plan', `  ${step.stepNumber}. ${step.description}`);
            }

            this.emit('plan', { plan: this.plan, raw: response });

            // In supervised mode, wait for user approval
            if (this.mode === 'supervised') {
                this._setState('waiting');
                this._log('system', 'Waiting for user approval of plan...');
            } else {
                // Autonomous: proceed immediately
                await this._executePhase();
            }
        } catch (e) {
            this._log('error', `Plan phase failed: ${e.message}`);
            this._setState('failed');
        }
    }

    /** Approve the current plan or step (supervised mode) */
    async approve() {
        if (this.state === 'waiting') {
            if (this.currentStep === -1) {
                // Approve plan → start execution
                this._log('system', 'Plan approved by user. Starting execution...');
                await this._executePhase();
            } else {
                // Approve current step → continue to next
                this._log('system', `Step ${this.currentStep + 1} approved. Continuing...`);
                await this._executeNextStep();
            }
        }
    }

    /** Skip the current step (supervised mode) */
    async skip() {
        if (this.state === 'waiting' && this.currentStep >= 0) {
            this._log('system', `Step ${this.currentStep + 1} skipped by user.`);
            this.stepResults.push({
                step: this.plan[this.currentStep],
                status: 'skipped',
                filesChanged: [],
                response: '',
            });
            await this._executeNextStep();
        }
    }

    /** Abort the entire task */
    abort() {
        this._log('system', 'Task aborted by user.');
        this._setState('aborted');
    }

    /** EXECUTE phase — iterate through plan steps */
    async _executePhase() {
        this.currentStep = -1;
        await this._executeNextStep();
    }

    async _executeNextStep() {
        this.currentStep++;
        this.retryCount = 0;

        if (this.currentStep >= this.plan.length) {
            // All steps done → verify
            await this._verifyPhase();
            return;
        }

        await this._executeSingleStep();
    }

    /** Execute a single plan step */
    async _executeSingleStep() {
        const step = this.plan[this.currentStep];
        this._setState('executing');
        this._log('execute', `Step ${step.stepNumber}: ${step.description}`);

        try {
            // Gather relevant files for context
            const relevantFiles = step.files.length > 0
                ? this.context.readFiles(step.files.map(f => {
                    // Resolve relative paths against project dir
                    return path.isAbsolute(f) ? f : path.join(this.projectDir, f);
                }).filter(f => fs.existsSync(f)))
                : [];

            // Also find files by keyword relevance
            const keywordFiles = this.context.getRelevantFiles(step.description, 5);
            const additionalPaths = keywordFiles
                .map(f => f.path)
                .filter(p => !relevantFiles.some(rf => rf.path === p));
            const additional = this.context.readFiles(additionalPaths);
            const allFiles = [...relevantFiles, ...additional];

            const filesContent = this.context.formatFilesForPrompt(allFiles);
            const projectSummary = this.context.getSummary();
            const prompt = executePrompt(step.description, filesContent, projectSummary);

            // Send to AI
            this._log('execute', `Sending prompt to ${this.providerId} (${prompt.length} chars)...`);
            const response = await this.bridge.askAI(this.providerId, prompt);
            this._log('execute', `Response received (${response.length} chars)`);

            // Extract code blocks
            const blocks = extractCodeBlocks(response);
            this._log('execute', `Extracted ${blocks.length} code block(s)`);

            // Apply to files
            const filesChanged = [];
            for (const block of blocks) {
                let targetPath = block.filePath;
                if (!targetPath) {
                    // Use first file from step description if available
                    if (step.files.length > 0) {
                        targetPath = step.files[0];
                    } else {
                        this._log('warning', 'No file path detected in AI response. Skipping block.');
                        continue;
                    }
                }

                // Resolve path
                if (!path.isAbsolute(targetPath)) {
                    targetPath = path.join(this.projectDir, targetPath);
                }

                // Write file
                fs.mkdirSync(path.dirname(targetPath), { recursive: true });
                fs.writeFileSync(targetPath, block.code, 'utf8');
                this._log('execute', `✅ Wrote ${path.relative(this.projectDir, targetPath)}`);
                filesChanged.push(targetPath);
            }

            this.stepResults.push({
                step,
                status: 'done',
                filesChanged,
                response: response.substring(0, 500),
            });

            // Refresh project context after file changes
            this.context.scan();

            this.emit('step-complete', {
                stepNumber: step.stepNumber,
                filesChanged,
                status: 'done',
            });

            // In supervised mode, wait for approval before next step
            if (this.mode === 'supervised') {
                this._setState('waiting');
                this._log('system', 'Waiting for user to approve step or continue...');
            } else {
                await this._executeNextStep();
            }

        } catch (e) {
            this._log('error', `Step ${step.stepNumber} failed: ${e.message}`);
            this.stepResults.push({ step, status: 'error', filesChanged: [], error: e.message });

            if (this.mode === 'autonomous' && this.retryCount < MAX_RETRIES) {
                this.retryCount++;
                this._log('iterate', `Retrying step (attempt ${this.retryCount}/${MAX_RETRIES})...`);
                await this._executeSingleStep();
            } else {
                this._setState('waiting');
                this._log('system', 'Step failed. Waiting for user to retry, skip, or abort.');
            }
        }
    }

    /** VERIFY phase — run tests/lint after all steps complete */
    async _verifyPhase() {
        this._setState('verifying');
        this._log('verify', 'Running verification...');

        // Try tests
        const testResult = this.runner.runTests();
        if (testResult.exitCode === -1) {
            this._log('verify', 'No test runner found. Skipping tests.');
        } else if (testResult.exitCode === 0) {
            this._log('verify', `✅ Tests passed (${testResult.durationMs}ms)`);
        } else {
            this._log('verify', `❌ Tests failed (exit code ${testResult.exitCode})`);
            this._log('verify', testResult.stderr || testResult.stdout);

            // ITERATE — try to fix
            if (this.mode === 'autonomous') {
                await this._iteratePhase(testResult);
                return;
            } else {
                this._setState('waiting');
                this._log('system', 'Tests failed. Review and approve retry, or abort.');
                this.emit('verify-failed', { testResult });
                return;
            }
        }

        // Try lint
        const lintResult = this.runner.runLint();
        if (lintResult.exitCode === -1) {
            this._log('verify', 'No linter found. Skipping lint.');
        } else if (lintResult.exitCode === 0) {
            this._log('verify', '✅ Lint passed');
        } else {
            this._log('verify', `⚠ Lint warnings/errors (exit code ${lintResult.exitCode})`);
        }

        // All done
        this._setState('complete');
        this._log('system', `🎉 Task complete! ${this.stepResults.filter(s => s.status === 'done').length} steps executed.`);
        this.emit('complete', this.getStatus());
    }

    /** ITERATE phase — send errors back to AI for fixing */
    async _iteratePhase(testResult) {
        if (this.retryCount >= MAX_RETRIES) {
            this._setState('failed');
            this._log('error', `Max retries (${MAX_RETRIES}) reached. Task needs manual intervention.`);
            return;
        }

        this.retryCount++;
        this._setState('iterating');
        this._log('iterate', `Fix attempt ${this.retryCount}/${MAX_RETRIES}...`);

        // Find the most recently changed files
        const lastResult = this.stepResults[this.stepResults.length - 1];
        if (!lastResult || lastResult.filesChanged.length === 0) {
            this._setState('failed');
            this._log('error', 'No files to fix.');
            return;
        }

        // Send fix prompt for each changed file
        for (const filePath of lastResult.filesChanged) {
            try {
                const code = fs.readFileSync(filePath, 'utf8');
                const errorOutput = (testResult.stderr + '\n' + testResult.stdout).substring(0, 2000);
                const prompt = fixPrompt(
                    path.relative(this.projectDir, filePath),
                    code,
                    errorOutput
                );

                this._log('iterate', `Asking AI to fix ${path.relative(this.projectDir, filePath)}...`);
                const response = await this.bridge.askAI(this.providerId, prompt);
                const blocks = extractCodeBlocks(response);

                if (blocks.length > 0) {
                    fs.writeFileSync(filePath, blocks[0].code, 'utf8');
                    this._log('iterate', `✅ Applied fix to ${path.relative(this.projectDir, filePath)}`);
                }
            } catch (e) {
                this._log('error', `Fix failed for ${filePath}: ${e.message}`);
            }
        }

        // Re-verify
        this.context.scan();
        await this._verifyPhase();
    }
}

export default AgentController;
