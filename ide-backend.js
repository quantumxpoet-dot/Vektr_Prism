/**
 * VektrIDE — Universal AI Bridge
 * 
 * Provider-agnostic Playwright bridge. Connects to any running Chrome
 * instance via CDP (port 9222) and injects prompts into whichever AI
 * chatbot tab is open. Provider selectors are loaded from providers.json.
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
        this.providers = [];
        this._loadProviders();
    }

    _loadProviders() {
        try {
            const raw = fs.readFileSync(path.join(__dirname, 'providers.json'), 'utf8');
            this.providers = JSON.parse(raw).providers || [];
        } catch (e) {
            console.error('⚠ Could not load providers.json:', e.message);
            this.providers = [];
        }
    }

    /** Reload providers from disk (hot-reload without restart) */
    reloadProviders() {
        this._loadProviders();
        return this.providers;
    }

    /** Connect to Chrome via CDP */
    async connect() {
        try {
            this.browser = await chromium.connectOverCDP('http://localhost:9222');
            console.log('✅ Connected to Chrome via CDP (port 9222)');
            return true;
        } catch (e) {
            console.error('❌ Could not connect to Chrome on port 9222.');
            console.error('   Launch Chrome with: chrome.exe --remote-debugging-port=9222');
            return false;
        }
    }

    /** Find the right browser tab for a given provider */
    _findPage(providerId) {
        if (!this.browser) return null;
        const provider = this.providers.find(p => p.id === providerId);
        if (!provider) return null;

        const contexts = this.browser.contexts();
        for (const ctx of contexts) {
            for (const page of ctx.pages()) {
                if (provider.urlPattern && page.url().includes(provider.urlPattern)) {
                    return { page, provider };
                }
            }
        }
        return null;
    }

    /** Auto-detect which provider tab is open */
    detectProvider() {
        if (!this.browser) return null;
        const contexts = this.browser.contexts();
        const allPages = contexts.flatMap(ctx => ctx.pages());

        for (const provider of this.providers) {
            if (!provider.urlPattern) continue; // skip generic
            for (const page of allPages) {
                if (page.url().includes(provider.urlPattern)) {
                    return { providerId: provider.id, providerName: provider.name, url: page.url() };
                }
            }
        }
        return null;
    }

    /** List all open AI tabs */
    listOpenProviders() {
        if (!this.browser) return [];
        const contexts = this.browser.contexts();
        const allPages = contexts.flatMap(ctx => ctx.pages());
        const found = [];

        for (const provider of this.providers) {
            if (!provider.urlPattern) continue;
            for (const page of allPages) {
                if (page.url().includes(provider.urlPattern)) {
                    found.push({ providerId: provider.id, providerName: provider.name, url: page.url() });
                }
            }
        }
        return found;
    }

    /**
     * Send a prompt to a specific AI provider tab and wait for response.
     * 
     * @param {string} providerId - Provider key from providers.json (e.g. "chatgpt")
     * @param {string} prompt - The full prompt text
     * @param {string} [fileContent] - Optional: file content to prepend as context
     * @returns {string} The AI response text
     */
    async askAI(providerId, prompt, fileContent = null) {
        const match = this._findPage(providerId);
        if (!match) {
            throw new Error(`No open tab found for provider "${providerId}". Open the chatbot in your browser first.`);
        }

        const { page, provider } = match;
        const fullPrompt = fileContent
            ? `Context (current file contents):\n\`\`\`\n${fileContent}\n\`\`\`\n\nTask: ${prompt}\n\nOutput only the raw code, no explanations.`
            : prompt;

        // 1. Focus the input and type the prompt
        const input = page.locator(provider.inputSelector).first();
        await input.click();
        await input.fill('');

        // Some chat UIs use contenteditable divs — fill() may not work for those.
        // Fall back to typing if fill doesn't populate.
        const filled = await input.textContent().catch(() => '');
        if (!filled || filled.length < 10) {
            await input.pressSequentially(fullPrompt, { delay: 2 });
        }

        // 2. Submit
        if (provider.submitMethod === 'enter') {
            await page.keyboard.press('Enter');
        } else if (provider.submitMethod.startsWith('click:')) {
            const btnSelector = provider.submitMethod.replace('click:', '');
            await page.locator(btnSelector).click();
        }

        // 3. Wait for response
        const waitMs = provider.waitMs || 5000;
        await page.waitForTimeout(waitMs);

        // 4. Wait for streaming to finish (poll until response stabilizes)
        let lastText = '';
        let stableCount = 0;
        for (let i = 0; i < 30; i++) { // max ~30s
            await page.waitForTimeout(1000);
            try {
                const current = await page.locator(provider.responseSelector).last().innerText();
                if (current === lastText && current.length > 0) {
                    stableCount++;
                    if (stableCount >= 2) break; // stable for 2s
                } else {
                    stableCount = 0;
                    lastText = current;
                }
            } catch {
                // selector not found yet, keep waiting
            }
        }

        // 5. Read final response
        const responseText = await page.locator(provider.responseSelector).last().innerText();
        console.log(`--- Response from ${provider.name} (${responseText.length} chars) ---`);
        return responseText;
    }

    /** Write code to a local file */
    async saveToFile(filePath, content) {
        const resolved = path.resolve(filePath);
        fs.mkdirSync(path.dirname(resolved), { recursive: true });
        fs.writeFileSync(resolved, content, 'utf8');
        console.log(`✅ Saved to ${resolved}`);
        return resolved;
    }

    async disconnect() {
        if (this.browser) {
            await this.browser.close().catch(() => { });
            this.browser = null;
        }
    }
}

export default IDEBridge;
