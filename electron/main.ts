import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import { registerMealImageCacheHandlers } from './imageCache';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

const preloadPath = path.join(__dirname, 'preload.js');

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#f5efe4',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
  });

  if (isDev) {
    void win.loadURL('http://localhost:5173');
  } else {
    void win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
}

void app.whenReady().then(() => {
  registerMealImageCacheHandlers();
  createWindow();
});
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
