/**
 * Vektr Prism — Agent Prompt Templates
 * 
 * Structured prompts for the agentic loop
 */

export const prompts = {
    /**
     * PLAN phase: Generate a step-by-step plan
     */
    plan: (goal, context) => {
        return `You are an expert software engineer and agentic coding assistant.

## Task
${goal}

## Project Context
- Project Directory: ${context.projectDir}
- Total Files: ${context.fileCount}
- Tech Stack: ${context.techStack.frameworks.join(', ') || 'Unknown'}
- Languages: ${context.techStack.languages.join(', ') || 'Unknown'}
- Build Tools: ${context.techStack.buildTools.join(', ') || 'None'}
- Testing: ${context.techStack.testing.join(', ') || 'None'}

## Key Files
${context.keyFiles.map(f => `- ${f.path}`).join('\n')}

## Instructions
1. Analyze the task and project structure
2. Break down the task into numbered, actionable steps
3. Each step should be specific and implementable
4. Consider dependencies between steps
5. Think about testing and verification

## Output Format
Provide a numbered list of steps. Each step should describe what needs to be done.

Example:
1. Create auth.js with JWT validation functions
2. Add auth middleware to server.js
3. Update /api/users route to use auth
4. Add tests for auth functionality
5. Update README with auth setup instructions

Generate the plan now:`;
    },

    /**
     * EXECUTE phase: Execute a single step
     */
    execute: (stepDescription, context) => {
        return `You are an expert software engineer implementing code changes.

## Current Step
${stepDescription}

## Project Context
- Project Directory: ${context.projectDir}
- Tech Stack: ${context.techStack.frameworks.join(', ') || 'Unknown'}

## Instructions
1. Implement the step described above
2. Write complete, working code
3. Include necessary imports and dependencies
4. Follow best practices for the tech stack
5. Make minimal, focused changes

## Output Format
For each file you need to create or modify, provide:
- File path (e.g., src/auth.js or src/server.js)
- The complete code in a code block

Example:
File: src/auth.js
\`\`\`javascript
import jwt from 'jsonwebtoken';

export function validateToken(token) {
    // implementation
}
\`\`\`

File: src/server.js
\`\`\`javascript
import { validateToken } from './auth.js';

// Add middleware
\`\`\`

Implement the step now:`;
    },

    /**
     * ITERATE phase: Fix an error and retry
     */
    iterate: (stepDescription, error, context) => {
        return `You are an expert software engineer fixing a bug or error.

## Step Being Executed
${stepDescription}

## Error Encountered
${error}

## Project Context
- Project Directory: ${context.projectDir}
- Tech Stack: ${context.techStack.frameworks.join(', ') || 'Unknown'}

## Instructions
1. Analyze the error and understand what went wrong
2. Provide a fix that addresses the root cause
3. Make minimal changes to fix the issue
4. Ensure the fix doesn't break other functionality

## Output Format
Provide the corrected code for the file that needs to be fixed.

Example:
File: src/auth.js
\`\`\`javascript
// Fixed code here
\`\`\`

Provide the fix now:`;
    },

    /**
     * VERIFY phase: Ask AI to analyze test results
     */
    verify: (testOutput, context) => {
        return `You are an expert software engineer analyzing test results.

## Test Output
${testOutput}

## Project Context
- Project Directory: ${context.projectDir}
- Tech Stack: ${context.techStack.frameworks.join(', ') || 'Unknown'}
- Testing Framework: ${context.techStack.testing.join(', ') || 'Unknown'}

## Instructions
1. Analyze the test results
2. Identify what failed and why
3. Suggest specific fixes for the failures
4. Be precise and actionable

## Output Format
Provide analysis and specific fix suggestions for each failure.`;
    },

    /**
     * CONTEXT phase: Build context for manual AI prompts
     */
    context: (query, context, fileContent = null) => {
        let prompt = `You are an expert software engineer helping with a coding task.

## Project Context
- Project Directory: ${context.projectDir}
- Tech Stack: ${context.techStack.frameworks.join(', ') || 'Unknown'}
- Languages: ${context.techStack.languages.join(', ') || 'Unknown'}
- Build Tools: ${context.techStack.buildTools.join(', ') || 'None'}
- Testing: ${context.techStack.testing.join(', ') || 'None'}

## Key Files
${context.keyFiles.map(f => `- ${f.path}`).join('\n')}
`;

        if (fileContent) {
            prompt += `\n## File Content\n\`\`\`\n${fileContent}\n\`\`\`\n`;
        }

        prompt += `\n## Question\n${query}\n\nProvide a helpful, specific answer.`;

        return prompt;
    },
};
