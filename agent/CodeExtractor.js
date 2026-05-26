/**
 * VektrIDE Agent — Code Extractor
 * 
 * Parses raw AI chatbot responses to extract structured code output.
 * Handles fenced code blocks, multi-file responses, and filepath detection.
 */

/**
 * Extract all fenced code blocks from an AI response.
 * 
 * Expected format from AI:
 *   `src/auth.js`
 *   ```javascript
 *   const jwt = require('jsonwebtoken');
 *   ...
 *   ```
 * 
 * @param {string} text - Raw AI response text
 * @returns {{ filePath: string|null, language: string, code: string }[]}
 */
export function extractCodeBlocks(text) {
    const blocks = [];
    // Match ```lang\ncode\n``` patterns
    const fenceRegex = /```(\w*)\n([\s\S]*?)```/g;
    let match;

    // Also look for file paths mentioned before code blocks
    const lines = text.split('\n');

    while ((match = fenceRegex.exec(text)) !== null) {
        const language = match[1] || 'plaintext';
        const code = match[2].trimEnd();

        // Look for a file path in the lines before this code block
        const blockStart = text.substring(0, match.index);
        const precedingLines = blockStart.split('\n').slice(-3); // check last 3 lines
        const filePath = detectFilePath(precedingLines);

        blocks.push({ filePath, language, code });
    }

    // If no fenced blocks found, treat the entire response as code
    if (blocks.length === 0 && text.trim().length > 0) {
        // Check if it looks like code (has common code patterns)
        if (looksLikeCode(text)) {
            blocks.push({ filePath: null, language: 'plaintext', code: text.trim() });
        }
    }

    return blocks;
}

/**
 * Extract a single code block (convenience for single-file operations).
 * Returns the first block's code, or the full text if no blocks found.
 */
export function extractFirstCode(text) {
    const blocks = extractCodeBlocks(text);
    if (blocks.length > 0) return blocks[0].code;
    return text.trim();
}

/**
 * Parse an AI plan response into a list of steps.
 * 
 * Expected AI format:
 *   1. Create auth middleware in src/middleware/auth.js
 *   2. Add login route to src/routes/auth.js
 *   3. Update src/app.js to use the new routes
 * 
 * @param {string} text - AI response containing a numbered plan
 * @returns {{ stepNumber: number, description: string, files: string[] }[]}
 */
export function parsePlan(text) {
    const steps = [];
    const lines = text.split('\n');

    for (const line of lines) {
        // Match numbered items: "1. Do something" or "1) Do something" or "- Step 1: ..."
        const numbered = line.match(/^\s*(\d+)[.)]\s+(.+)/);
        if (numbered) {
            const description = numbered[2].trim();
            const files = extractFilePaths(description);
            steps.push({
                stepNumber: parseInt(numbered[1]),
                description,
                files,
            });
        }
    }

    // If no numbered steps found, try to split by sentences or bullet points
    if (steps.length === 0) {
        const bullets = lines.filter(l => l.match(/^\s*[-*•]\s+/));
        for (let i = 0; i < bullets.length; i++) {
            const description = bullets[i].replace(/^\s*[-*•]\s+/, '').trim();
            steps.push({
                stepNumber: i + 1,
                description,
                files: extractFilePaths(description),
            });
        }
    }

    return steps;
}

/**
 * Detect a file path from preceding lines before a code block.
 */
function detectFilePath(lines) {
    for (const line of lines.reverse()) {
        const cleaned = line.replace(/[`*#:\-]/g, '').trim();
        // Match patterns like "src/auth.js" or "C:\projects\file.js"
        const pathMatch = cleaned.match(
            /([a-zA-Z]:\\[\w\\\-./]+\.\w+|(?:[\w\-./]+\/)*[\w\-]+\.\w+)/
        );
        if (pathMatch) return pathMatch[1];
    }
    return null;
}

/**
 * Extract file paths mentioned in a description string.
 */
function extractFilePaths(text) {
    const paths = [];
    // Unix-style paths
    const unixMatches = text.matchAll(/(?:[\w\-./]+\/)+[\w\-]+\.\w+/g);
    for (const m of unixMatches) paths.push(m[0]);
    // Windows-style paths
    const winMatches = text.matchAll(/[a-zA-Z]:\\[\w\\\-.]+\.\w+/g);
    for (const m of winMatches) paths.push(m[0]);
    // Backtick-wrapped names
    const tickMatches = text.matchAll(/`([^`]+\.\w+)`/g);
    for (const m of tickMatches) {
        if (!paths.includes(m[1])) paths.push(m[1]);
    }
    return paths;
}

/**
 * Heuristic: does this text look like code?
 */
function looksLikeCode(text) {
    const codeIndicators = [
        /\bfunction\b/, /\bconst\b/, /\blet\b/, /\bvar\b/, /\bclass\b/,
        /\bimport\b/, /\bexport\b/, /\brequire\b/,
        /\bdef\b/, /\breturn\b/, /\bif\b.*{/,
        /[{}();]/, /=>/,
    ];
    return codeIndicators.some(re => re.test(text));
}

export default { extractCodeBlocks, extractFirstCode, parsePlan };
