/**
 * Vektr Prism — Agent Controller
 * 
 * Orchestrates the agentic loop: PLAN → EXECUTE → VERIFY → ITERATE
 */

import { EventEmitter } from 'events';
import { ProjectContext } from './ProjectContext.js';
import { CodeExtractor } from './CodeExtractor.js';
import { TaskRunner } from './TaskRunner.js';
import { prompts } from './prompts.js';
import fs from 'fs';
import path from 'path';

export class AgentController extends EventEmitter {
    constructor(bridge) {
        super();
        this.bridge = bridge;
        this.state = 'idle';
        this.goal = '';
        this.projectDir = '';
        this.mode = 'supervised'; // 'supervised' or 'autonomous'
        this.provider = null;
        this.plan = [];
        this.currentStep = 0;
        this.maxRetries = 3;
        this.retryCount = 0;
        this.approved = false;
        this.aborted = false;
    }

    /**
     * Start a new agentic task
     */
    async startTask(goal, projectDir, mode = 'supervised', provider = null) {
        this.goal = goal;
        this.projectDir = projectDir;
        this.mode = mode;
        this.provider = provider;
        this.state = 'planning';
        this.plan = [];
        this.currentStep = 0;
        this.retryCount = 0;
        this.approved = false;
        this.aborted = false;

        this.emit('log', { timestamp: Date.now(), type: 'info', message: `Starting task: ${goal}` });
        this.emit('state', { state: this.state, step: 0, total: 0 });

        try {
            await this.planPhase();
            if (this.aborted) return;

            if (this.mode === 'supervised') {
                this.state = 'awaiting_approval';
                this.emit('state', { state: this.state, step: 0, total: this.plan.length });
                this.emit('plan', { plan: this.plan });
                this.emit('log', { timestamp: Date.now(), type: 'info', message: 'Plan generated. Awaiting approval...' });
                // Wait for user approval via approve() method
                return;
            }

            // Autonomous mode: proceed immediately
            await this.executePhase();
        } catch (e) {
            this.emit('log', { timestamp: Date.now(), type: 'error', message: `Task failed: ${e.message}` });
            this.emit('error', { message: e.message });
            this.state = 'idle';
        }
    }

    /**
     * PLAN phase: Ask AI to generate a step-by-step plan
     */
    async planPhase() {
        this.emit('log', { timestamp: Date.now(), type: 'info', message: 'Analyzing project and generating plan...' });

        const projectContext = new ProjectContext(this.projectDir);
        const context = await projectContext.buildContext();

        const prompt = prompts.plan(this.goal, context);

        const response = await this.bridge.askAI(
            this.provider || 'generic',
            prompt
        );

        // Parse the plan from the AI response
        this.plan = this.parsePlan(response);
        
        if (this.plan.length === 0) {
            throw new Error('Failed to generate a valid plan');
        }

        this.emit('log', { timestamp: Date.now(), type: 'info', message: `Plan generated with ${this.plan.length} steps` });
    }

    /**
     * Parse plan from AI response
     * Expects numbered list like:
     * 1. Create auth.js with JWT validation
     * 2. Add auth middleware to server.js
     * 3. Update routes to use auth
     */
    parsePlan(response) {
        const lines = response.split('\n');
        const steps = [];

        for (const line of lines) {
            const match = line.match(/^(\d+)[.)]\s+(.+)/);
            if (match) {
                steps.push({
                    number: parseInt(match[1]),
                    description: match[2].trim(),
                    status: 'pending',
                });
            }
        }

        return steps;
    }

    /**
     * EXECUTE phase: Execute each step in the plan
     */
    async executePhase() {
        this.state = 'executing';
        
        for (let i = 0; i < this.plan.length; i++) {
            if (this.aborted) break;

            this.currentStep = i;
            this.plan[i].status = 'in_progress';
            
            this.emit('state', { state: this.state, step: i + 1, total: this.plan.length });
            this.emit('log', { 
                timestamp: Date.now(), 
                type: 'info', 
                message: `Executing step ${i + 1}/${this.plan.length}: ${this.plan[i].description}` 
            });

            try {
                await this.executeStep(this.plan[i]);
                this.plan[i].status = 'complete';
                this.emit('step-complete', { stepNumber: i + 1, description: this.plan[i].description });

                if (this.mode === 'supervised') {
                    this.state = 'awaiting_approval';
                    this.emit('state', { state: this.state, step: i + 1, total: this.plan.length });
                    this.emit('log', { timestamp: Date.now(), type: 'info', message: 'Step complete. Awaiting approval for next step...' });
                    // Wait for user approval
                    return;
                }

            } catch (e) {
                this.plan[i].status = 'failed';
                this.emit('log', { timestamp: Date.now(), type: 'error', message: `Step failed: ${e.message}` });
                
                // Try to recover with VERIFY→ITERATE
                await this.verifyPhase(e);
                if (this.aborted) break;
            }
        }

        if (!this.aborted) {
            this.state = 'complete';
            this.emit('complete', { 
                goal: this.goal,
                steps: this.plan,
                totalSteps: this.plan.length,
                completedSteps: this.plan.filter(s => s.status === 'complete').length
            });
            this.emit('log', { timestamp: Date.now(), type: 'success', message: 'Task completed successfully!' });
        }

        this.state = 'idle';
    }

    /**
     * Execute a single step
     */
    async executeStep(step) {
        const projectContext = new ProjectContext(this.projectDir);
        const context = await projectContext.buildContext();

        const prompt = prompts.execute(step.description, context);

        const response = await this.bridge.askAI(
            this.provider || 'generic',
            prompt
        );

        // Extract code blocks and file paths from response
        const extractor = new CodeExtractor();
        const codeChanges = extractor.extract(response);

        // Apply each code change
        for (const change of codeChanges) {
            const filePath = path.join(this.projectDir, change.filePath);
            
            // Create directory if it doesn't exist
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Write file
            fs.writeFileSync(filePath, change.code, 'utf8');
            
            this.emit('log', { 
                timestamp: Date.now(), 
                type: 'info', 
                message: `Wrote ${change.filePath}` 
            });
        }

        if (codeChanges.length === 0) {
            this.emit('log', { 
                timestamp: Date.now(), 
                type: 'warning', 
                message: 'No code changes extracted from AI response' 
            });
        }
    }

    /**
     * VERIFY phase: Run tests/verification
     */
    async verifyPhase(error = null) {
        this.state = 'verifying';
        this.emit('state', { state: this.state, step: this.currentStep + 1, total: this.plan.length });
        this.emit('log', { timestamp: Date.now(), type: 'info', message: 'Running verification...' });

        const taskRunner = new TaskRunner(this.projectDir);

        // Try to run tests
        try {
            const testResult = await taskRunner.runTests();
            
            if (testResult.success) {
                this.emit('log', { timestamp: Date.now(), type: 'success', message: 'Tests passed!' });
                return; // Success, no iteration needed
            } else {
                this.emit('log', { 
                    timestamp: Date.now(), 
                    type: 'error', 
                    message: `Tests failed: ${testResult.output}` 
                });
                this.emit('verify-failed', { output: testResult.output });
            }
        } catch (e) {
            this.emit('log', { 
                timestamp: Date.now(), 
                type: 'warning', 
                message: `Could not run tests: ${e.message}. Proceeding anyway.` 
            });
        }

        // If we have an error or tests failed, try to iterate
        if (error || this.retryCount < this.maxRetries) {
            await this.iteratePhase(error);
        }
    }

    /**
     * ITERATE phase: Ask AI to fix the error and retry
     */
    async iteratePhase(error) {
        this.retryCount++;
        
        if (this.retryCount > this.maxRetries) {
            this.emit('log', { 
                timestamp: Date.now(), 
                type: 'error', 
                message: `Max retries (${this.maxRetries}) exceeded. Stopping.` 
            });
            throw new Error('Max retries exceeded');
        }

        this.state = 'iterating';
        this.emit('state', { state: this.state, step: this.currentStep + 1, total: this.plan.length });
        this.emit('log', { 
            timestamp: Date.now(), 
            type: 'info', 
            message: `Attempting fix (retry ${this.retryCount}/${this.maxRetries})...` 
        });

        const projectContext = new ProjectContext(this.projectDir);
        const context = await projectContext.buildContext();

        const prompt = prompts.iterate(
            this.plan[this.currentStep].description,
            error?.message || 'Tests failed',
            context
        );

        const response = await this.bridge.askAI(
            this.provider || 'generic',
            prompt
        );

        // Extract and apply code changes
        const extractor = new CodeExtractor();
        const codeChanges = extractor.extract(response);

        for (const change of codeChanges) {
            const filePath = path.join(this.projectDir, change.filePath);
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(filePath, change.code, 'utf8');
            
            this.emit('log', { 
                timestamp: Date.now(), 
                type: 'info', 
                message: `Applied fix to ${change.filePath}` 
            });
        }

        // Retry the step
        await this.executeStep(this.plan[this.currentStep]);
    }

    /**
     * Approve the current step (supervised mode)
     */
    async approve() {
        if (this.state !== 'awaiting_approval') {
            return;
        }

        this.approved = true;
        this.emit('log', { timestamp: Date.now(), type: 'info', message: 'Step approved. Continuing...' });

        // Continue execution
        if (this.currentStep < this.plan.length - 1) {
            await this.executePhase();
        } else {
            // All steps complete
            this.state = 'complete';
            this.emit('complete', { 
                goal: this.goal,
                steps: this.plan,
                totalSteps: this.plan.length,
                completedSteps: this.plan.filter(s => s.status === 'complete').length
            });
            this.emit('log', { timestamp: Date.now(), type: 'success', message: 'Task completed successfully!' });
            this.state = 'idle';
        }
    }

    /**
     * Skip the current step (supervised mode)
     */
    async skip() {
        if (this.state !== 'awaiting_approval') {
            return;
        }

        this.emit('log', { timestamp: Date.now(), type: 'warning', message: 'Step skipped.' });
        this.plan[this.currentStep].status = 'skipped';

        // Continue to next step
        if (this.currentStep < this.plan.length - 1) {
            await this.executePhase();
        } else {
            this.state = 'complete';
            this.emit('complete', { 
                goal: this.goal,
                steps: this.plan,
                totalSteps: this.plan.length,
                completedSteps: this.plan.filter(s => s.status === 'complete').length
            });
            this.state = 'idle';
        }
    }

    /**
     * Abort the current task
     */
    abort() {
        this.aborted = true;
        this.state = 'idle';
        this.emit('log', { timestamp: Date.now(), type: 'warning', message: 'Task aborted by user.' });
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            state: this.state,
            goal: this.goal,
            projectDir: this.projectDir,
            mode: this.mode,
            provider: this.provider,
            plan: this.plan,
            currentStep: this.currentStep,
            retryCount: this.retryCount,
        };
    }
}
