import { app, BrowserWindow, nativeImage, shell } from 'electron';
import * as path from 'path';
import { registerMealImageCacheHandlers } from './imageCache';
import {
  closeLocalRecipesDb,
  registerLocalRecipesHandlers,
} from './localRecipesHandlers';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

const preloadPath = path.join(__dirname, 'preload.js');

/** Icons live under `build/` in dev; packaged builds copy them via `electron-builder` extraResources. */
function buildAssetsDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'build');
  }
  return path.join(__dirname, '..', 'build');
}

/**
 * Dock tiles are a fixed size on macOS — Electron scales whatever bitmap we pass to fill that tile,
 * so shrinking pixel dimensions does not make the badge smaller. Padding lives in `build/icon-source.svg`.
 * Here we only cap size for memory / sharpness when handing PNG to `app.dock.setIcon`.
 */
const MAX_DOCK_ICON_RASTER_PX = 512;

/** Prefer PNG for Dock — ICNS multi-resolution sources sometimes scale inconsistently in Electron. */
function loadDockIcon(): Electron.NativeImage | null {
  const dir = buildAssetsDir();
  const pngPath = path.join(dir, 'icon.png');
  const icnsPath = path.join(dir, 'icon.icns');

  let img = nativeImage.createFromPath(pngPath);
  if (img.isEmpty()) {
    img = nativeImage.createFromPath(icnsPath);
  }
  if (img.isEmpty()) return null;

  const { width, height } = img.getSize();
  if (width <= MAX_DOCK_ICON_RASTER_PX && height <= MAX_DOCK_ICON_RASTER_PX) {
    return img;
  }
  return img.resize({
    width: MAX_DOCK_ICON_RASTER_PX,
    height: MAX_DOCK_ICON_RASTER_PX,
    quality: 'best',
  });
}

function createWindow(): void {
  const iconPath = path.join(buildAssetsDir(), 'icon.png');

  const win = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#f5efe4',
    icon: iconPath,
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
  registerLocalRecipesHandlers();
  if (process.platform === 'darwin') {
    const dockIcon = loadDockIcon();
    if (dockIcon) {
      app.dock.setIcon(dockIcon);
    }
  }
  createWindow();
});
app.on('before-quit', () => {
  closeLocalRecipesDb();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
