/**
 * Vektr Prism — Electron Main Process
 * 
 * Wraps the Express server + React frontend as a desktop app
 */

const { app, BrowserWindow, ipcMain, autoUpdater } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Auto-updater configuration
const server = 'https://update.vektrprism.com'; // Replace with your update server
const feed = `${server}/update/${process.platform}/${app.getVersion()}`;

autoUpdater.setFeedURL(feed);

let mainWindow = null;
let serverProcess = null;
let serverReady = false;

const isDev = process.env.NODE_ENV === 'development';

/**
 * Create the main browser window
 */
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs'),
        },
        icon: path.join(__dirname, '../assets/icon.png'),
        title: 'Vektr Prism',
        titleBarStyle: 'default',
    });

    // Load the app
    if (isDev) {
        // Development: load from Vite dev server
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        // Production: load from Express server
        // Wait for server to be ready, then load
        checkServerAndLoad();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

/**
 * Check if Express server is ready, then load
 */
function checkServerAndLoad() {
    const maxAttempts = 30; // 30 seconds
    let attempts = 0;

    const checkInterval = setInterval(() => {
        attempts++;
        
        if (serverReady || attempts >= maxAttempts) {
            clearInterval(checkInterval);
            mainWindow.loadURL('http://localhost:3001');
        }
    }, 1000);
}

/**
 * Start the Express server
 */
function startServer() {
    const serverPath = path.join(__dirname, '..', 'server.js');
    
    serverProcess = spawn('node', [serverPath], {
        cwd: path.join(__dirname, '..'),
        stdio: 'pipe',
        env: { ...process.env, PORT: '3001' },
    });

    serverProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('[Server]', output);
        
        // Detect when server is ready
        if (output.includes('Vektr Prism') && output.includes('localhost:3001')) {
            serverReady = true;
        }
    });

    serverProcess.stderr.on('data', (data) => {
        console.error('[Server Error]', data.toString());
    });

    serverProcess.on('close', (code) => {
        console.log(`[Server] exited with code ${code}`);
        serverProcess = null;
    });
}

/**
 * Stop the Express server
 */
function stopServer() {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
}

/**
 * Auto-updater event handlers
 */
autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info);
    if (mainWindow) {
        mainWindow.webContents.send('update-available', info);
    }
});

autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available:', info);
    if (mainWindow) {
        mainWindow.webContents.send('update-not-available', info);
    }
});

autoUpdater.on('download-progress', (progress) => {
    console.log('Download progress:', progress);
    if (mainWindow) {
        mainWindow.webContents.send('download-progress', progress);
    }
});

autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info);
    if (mainWindow) {
        mainWindow.webContents.send('update-downloaded', info);
    }
});

autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err);
    if (mainWindow) {
        mainWindow.webContents.send('update-error', err);
    }
});

/**
 * App lifecycle
 */
app.whenReady().then(() => {
    createWindow();
    
    if (!isDev) {
        startServer();
        // Check for updates on startup (only in production)
        autoUpdater.checkForUpdates();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // On macOS, keep app running even when all windows are closed
    if (process.platform !== 'darwin') {
        stopServer();
        app.quit();
    }
});

app.on('before-quit', () => {
    stopServer();
});

/**
 * IPC handlers
 */
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.handle('get-platform', () => {
    return process.platform;
});

ipcMain.handle('restart-server', () => {
    stopServer();
    serverReady = false;
    startServer();
    return { ok: true };
});

ipcMain.handle('open-external', (event, url) => {
    require('electron').shell.openExternal(url);
});

ipcMain.handle('show-item-in-folder', (event, filePath) => {
    require('electron').shell.showItemInFolder(filePath);
});

// Auto-updater IPC handlers
ipcMain.handle('check-for-updates', () => {
    autoUpdater.checkForUpdates();
    return { ok: true };
});

ipcMain.handle('download-update', () => {
    autoUpdater.downloadUpdate();
    return { ok: true };
});

ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
    return { ok: true };
});
