/**
 * VektrIDE — Playwright Bridge (CDP)
 * 
 * Connects to Chrome via Chrome DevTools Protocol to automate AI chatbots.
 * No API keys — uses your existing browser session.
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class IDEBridge {
    constructor() {
        this.browser = null;
        this.context = null;
        this.providers = this.loadProviders();
    }

    loadProviders() {
        try {
            const providersPath = path.join(__dirname, 'providers.json');
            const data = fs.readFileSync(providersPath, 'utf8');
            const config = JSON.parse(data);
            return config.providers.filter(p => !p._section);
        } catch (e) {
            console.error('Failed to load providers.json:', e.message);
            return [];
        }
    }

    /**
     * Connect to Chrome via CDP on the default debug port (9222)
     */
    async connect() {
        try {
            this.browser = await chromium.connectOverCDP('http://localhost:9222');
            this.context = this.browser.contexts()[0];
            console.log('✅ Connected to Chrome via CDP');
            return true;
        } catch (e) {
            console.error('❌ Failed to connect to Chrome:', e.message);
            console.log('   Make sure Chrome is running with: --remote-debugging-port=9222');
            return false;
        }
    }

    /**
     * Disconnect from browser
     */
    async disconnect() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.context = null;
            console.log('🔌 Disconnected from Chrome');
        }
    }

    /**
     * Detect which AI provider is currently active based on open tabs
     */
    detectProvider() {
        if (!this.context) return null;

        const pages = this.context.pages();
        for (const page of pages) {
            const url = page.url();
            if (url === 'about:blank') continue;

            for (const provider of this.providers) {
                if (provider.urlPattern && url.includes(provider.urlPattern)) {
                    console.log(`🔍 Detected provider: ${provider.name} (${url})`);
                    return { providerId: provider.id, page, url };
                }
            }
        }

        return null;
    }

    /**
     * List all open tabs that match configured providers
     */
    listOpenProviders() {
        if (!this.context) return [];

        const openTabs = [];
        const pages = this.context.pages();

        for (const page of pages) {
            const url = page.url();
            if (url === 'about:blank') continue;

            const matched = this.providers.find(p => p.urlPattern && url.includes(p.urlPattern));
            if (matched) {
                openTabs.push({
                    providerId: matched.id,
                    name: matched.name,
                    url,
                });
            }
        }

        return openTabs;
    }

    /**
     * Send a prompt to the AI and get the response
     */
    async askAI(providerId, prompt, code = null) {
        if (!this.context) {
            throw new Error('Not connected to browser. Call connect() first.');
        }

        const provider = this.providers.find(p => p.id === providerId) || this.providers.find(p => p.id === 'generic');
        if (!provider) {
            throw new Error(`Provider not found: ${providerId}`);
        }

        // Find or create a page for this provider
        let page = this.findPageForProvider(provider);
        if (!page) {
            // If no matching tab, use the first available page or create one
            const pages = this.context.pages();
            page = pages[0] || await this.context.newPage();
        }

        // Build the full prompt
        let fullPrompt = prompt;
        if (code) {
            fullPrompt = `${prompt}\n\n\`\`\`\n${code}\n\`\`\``;
        }

        // Type the prompt
        await this.typePrompt(page, provider, fullPrompt);

        // Submit
        await this.submitPrompt(page, provider);

        // Wait for and extract response
        const response = await this.extractResponse(page, provider);

        return response;
    }

    /**
     * Find a page that matches the provider's URL pattern
     */
    findPageForProvider(provider) {
        const pages = this.context.pages();
        for (const page of pages) {
            const url = page.url();
            if (url === 'about:blank') continue;
            if (provider.urlPattern && url.includes(provider.urlPattern)) {
                return page;
            }
        }
        return null;
    }

    /**
     * Type prompt into the input field
     */
    async typePrompt(page, provider, prompt) {
        const inputSelector = provider.inputSelector || 'textarea, [contenteditable="true"], [role="textbox"]';
        
        try {
            // Wait for input to be visible
            await page.waitForSelector(inputSelector, { timeout: 5000 });
            
            // Clear existing content
            await page.fill(inputSelector, '');
            
            // Type the prompt
            await page.fill(inputSelector, prompt);
            
            console.log('✅ Prompt typed');
        } catch (e) {
            throw new Error(`Failed to type prompt: ${e.message}`);
        }
    }

    /**
     * Submit the prompt (usually Enter key)
     */
    async submitPrompt(page, provider) {
        const inputSelector = provider.inputSelector || 'textarea, [contenteditable="true"], [role="textbox"]';
        const submitMethod = provider.submitMethod || 'enter';

        try {
            if (submitMethod === 'enter') {
                await page.press(inputSelector, 'Enter');
            } else {
                // Try clicking a submit button if not enter
                const submitSelector = 'button[type="submit"], button:has-text("Send"), button:has-text("Submit")';
                await page.click(submitSelector);
            }
            console.log('✅ Prompt submitted');
        } catch (e) {
            throw new Error(`Failed to submit prompt: ${e.message}`);
        }
    }

    /**
     * Wait for response and extract it
     */
    async extractResponse(page, provider) {
        const responseSelector = provider.responseSelector || '.markdown, .prose, [class*="message"], [class*="response"]';
        const waitMs = provider.waitMs || 6000;

        try {
            // Initial wait
            await page.waitForTimeout(waitMs);

            // Wait for response element to appear
            await page.waitForSelector(responseSelector, { timeout: 30000 });

            // Wait for response to stabilize (no new text for 2 seconds)
            let lastText = '';
            let stableCount = 0;
            
            while (stableCount < 3) {
                const responseElement = await page.$(responseSelector);
                if (!responseElement) {
                    await page.waitForTimeout(500);
                    continue;
                }

                const currentText = await responseElement.textContent();
                
                if (currentText === lastText) {
                    stableCount++;
                } else {
                    stableCount = 0;
                    lastText = currentText;
                }
                
                await page.waitForTimeout(500);
            }

            // Get the final response
            const responseElement = await page.$(responseSelector);
            const responseText = await responseElement.textContent();
            
            console.log('✅ Response extracted');
            return responseText.trim();
        } catch (e) {
            throw new Error(`Failed to extract response: ${e.message}`);
        }
    }

    /**
     * Upload files to NotebookLM
     * This opens NotebookLM, creates a new notebook, and uploads the provided files
     */
    async uploadToNotebookLM(filePaths, title, progressCallback) {
        if (!this.context) {
            throw new Error('Not connected to browser. Call connect() first.');
        }

        try {
            // Find or open NotebookLM
            let page = this.findPageForProvider({ urlPattern: 'notebooklm.google.com' });
            
            if (!page) {
                progressCallback?.({ step: 0, message: 'Opening NotebookLM...' });
                page = await this.context.newPage();
                await page.goto('https://notebooklm.google.com/');
            } else {
                progressCallback?.({ step: 0, message: 'Using existing NotebookLM tab...' });
                await page.bringToFront();
            }

            // Wait for page to load
            await page.waitForLoadState('networkidle');
            progressCallback?.({ step: 1, message: 'NotebookLM loaded' });

            // Click "Create new notebook" button
            progressCallback?.({ step: 2, message: 'Creating new notebook...' });
            const createButton = await page.$('button:has-text("Create"), button:has-text("New")');
            if (createButton) {
                await createButton.click();
                await page.waitForTimeout(2000);
            }

            // Set notebook title if provided
            if (title) {
                progressCallback?.({ step: 3, message: 'Setting notebook title...' });
                const titleInput = await page.$('input[type="text"], [contenteditable="true"]');
                if (titleInput) {
                    await titleInput.fill(title);
                    await page.waitForTimeout(1000);
                }
            }

            // Upload files
            progressCallback?.({ step: 4, message: `Uploading ${filePaths.length} files...` });
            
            // Look for file upload input or drag-drop zone
            const fileInput = await page.$('input[type="file"]');
            if (fileInput) {
                await fileInput.setInputFiles(filePaths);
            } else {
                // Try drag-drop approach
                const dropZone = await page.$('[data-drop-zone], .drop-zone');
                if (dropZone) {
                    // Playwright's setInputFiles works on elements that accept file input
                    // We'll try to find the hidden file input
                    const hiddenInput = await page.$('input[type="file"][hidden], input[type="file"][style*="display: none"]');
                    if (hiddenInput) {
                        await hiddenInput.setInputFiles(filePaths);
                    }
                }
            }

            // Wait for uploads to complete
            await page.waitForTimeout(5000);
            progressCallback?.({ step: 5, message: 'Files uploaded successfully' });

        } catch (e) {
            throw new Error(`Failed to upload to NotebookLM: ${e.message}`);
        }
    }
}
