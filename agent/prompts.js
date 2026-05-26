/**
 * VektrIDE Agent — Structured Prompt Templates
 * 
 * Prompt engineering for agentic mode. These prompts instruct the AI
 * to respond in structured, parseable formats.
 */

/**
 * PLAN prompt — asks the AI to break a goal into numbered steps.
 */
export function planPrompt(projectSummary, goal) {
    return `You are a senior software engineer acting as an autonomous coding agent.

PROJECT CONTEXT:
${projectSummary}

GOAL: ${goal}

Break this goal into a numbered list of concrete implementation steps.
Each step should describe a single file operation (create, modify, or delete a file).
Include the file path in each step.

Rules:
- Be specific. Name exact files and functions.
- Order steps by dependency (foundations first).
- Keep each step small enough to implement in one shot.
- Maximum 15 steps.

Format your response EXACTLY as:
1. [description including \`filepath\`]
2. [description including \`filepath\`]
...

Output ONLY the numbered list. No preamble, no explanations.`;
}

/**
 * EXECUTE prompt — asks the AI to implement a specific step.
 */
export function executePrompt(stepDescription, relevantFilesContent, projectSummary) {
    return `You are a senior software engineer. Implement the following step precisely.

PROJECT OVERVIEW:
${projectSummary}

CURRENT FILE CONTENTS:
${relevantFilesContent || '(no existing files for this step)'}

STEP TO IMPLEMENT:
${stepDescription}

Rules:
- Output the COMPLETE file contents, not just a diff.
- If modifying an existing file, include ALL the code (modified + unchanged).
- Format each file as the filepath on its own line, followed by a fenced code block.
- If creating multiple files, output each one separately.

Format:
\`filepath/to/file.js\`
\`\`\`javascript
// complete file code here
\`\`\`

Output ONLY the code. No explanations, no commentary.`;
}

/**
 * FIX prompt — asks the AI to fix code given an error.
 */
export function fixPrompt(filePath, code, errorOutput) {
    return `You are a senior software engineer. The following code has an error. Fix it.

FILE: ${filePath}

CURRENT CODE:
\`\`\`
${code}
\`\`\`

ERROR OUTPUT:
\`\`\`
${errorOutput}
\`\`\`

Rules:
- Output the COMPLETE corrected file, not a diff.
- Fix ONLY the error. Do not refactor or change unrelated code.
- Format as the filepath followed by a fenced code block.

Format:
\`${filePath}\`
\`\`\`
// complete fixed code
\`\`\`

Output ONLY the code. No explanations.`;
}

/**
 * ANALYZE prompt — asks the AI to analyze code for issues.
 */
export function analyzePrompt(filesContent, question) {
    return `You are a senior software engineer analyzing code.

FILES:
${filesContent}

QUESTION: ${question}

Provide a concise technical analysis. Be specific about line numbers and function names.`;
}

export default { planPrompt, executePrompt, fixPrompt, analyzePrompt };
