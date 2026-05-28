/**
 * Vektr Prism — NotebookLM Exporter
 * 
 * Exports project files as .txt for NotebookLM upload
 */

import fs from 'fs';
import path from 'path';

export function exportForNotebookLM(projectDir, options = {}) {
    const { notebookName } = options;
    
    // Create output directory
    const outputDir = path.join(projectDir, 'notebooklm-export');
    
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // Scan project files
    const files = scanDirectory(projectDir);
    
    let exported = 0;
    let skipped = 0;
    const exportedFiles = [];

    // Export each file
    for (const file of files) {
        const result = exportFile(file, outputDir);
        
        if (result.success) {
            exported++;
            exportedFiles.push(result.fileName);
        } else {
            skipped++;
        }
    }

    // Create index file
    createIndexFile(outputDir, exportedFiles, projectDir, notebookName);

    return {
        exported,
        skipped,
        outputDir,
        files: exportedFiles,
    };
}

/**
 * Scan directory for files to export
 */
function scanDirectory(dir, relativePath = '') {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        // Skip excluded directories
        if (
            entry.name === 'node_modules' ||
            entry.name === '.git' ||
            entry.name === 'dist' ||
            entry.name === 'build' ||
            entry.name === '.next' ||
            entry.name === 'coverage' ||
            entry.name === 'notebooklm-export' ||
            entry.name.startsWith('.')
        ) {
            continue;
        }

        const fullPath = path.join(dir, entry.name);
        const relPath = path.join(relativePath, entry.name);

        if (entry.isDirectory()) {
            files.push(...scanDirectory(fullPath, relPath));
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            
            // Skip binary files and large files
            const binaryExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.tar', '.gz'];
            const stat = fs.statSync(fullPath);
            
            if (!binaryExtensions.includes(ext) && stat.size < 500000) { // 500KB limit
                files.push({
                    path: relPath,
                    fullPath: fullPath,
                    extension: ext,
                    size: stat.size,
                });
            }
        }
    }

    return files;
}

/**
 * Export a single file to .txt
 */
function exportFile(file, outputDir) {
    try {
        const content = fs.readFileSync(file.fullPath, 'utf8');
        
        // Create safe filename
        const safeName = file.path.replace(/[^a-zA-Z0-9._-]/g, '_');
        const outputPath = path.join(outputDir, `${safeName}.txt`);
        
        // Write with header
        const header = `File: ${file.path}\n${'='.repeat(50)}\n\n`;
        fs.writeFileSync(outputPath, header + content, 'utf8');
        
        return { success: true, fileName: `${safeName}.txt` };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Create index file listing all exported files
 */
function createIndexFile(outputDir, files, projectDir, notebookName) {
    const indexContent = `NotebookLM Export
${'='.repeat(50)}

Project: ${projectDir}
Notebook Name: ${notebookName || 'Vektr Prism Export'}
Export Date: ${new Date().toISOString()}
Total Files: ${files.length}

Exported Files:
${files.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Instructions:
1. Upload all .txt files from this directory to NotebookLM
2. Create a new notebook
3. Add all files as sources
4. You can now ask questions about your codebase
`;

    fs.writeFileSync(path.join(outputDir, '00_INDEX.txt'), indexContent, 'utf8');
}
