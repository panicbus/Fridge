import { app, ipcMain } from 'electron';
import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { pathToFileURL } from 'url';

const CACHE_SUBDIR = 'meal-image-cache';
const inflight = new Map<string, Promise<string>>();

function cacheRoot(): string {
  return path.join(app.getPath('userData'), CACHE_SUBDIR);
}

function isCacheableMealImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.protocol === 'https:' &&
      u.hostname === 'www.themealdb.com' &&
      u.pathname.startsWith('/images/')
    );
  } catch {
    return false;
  }
}

function cacheFilePathForUrl(url: string): string {
  const hash = createHash('sha256').update(url).digest('hex');
  let ext = path.extname(new URL(url).pathname).toLowerCase();
  if (!ext || ext.length > 5) ext = '.img';
  return path.join(cacheRoot(), `${hash}${ext}`);
}

async function downloadToFile(remoteUrl: string, dest: string): Promise<void> {
  const res = await fetch(remoteUrl);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const tmp = `${dest}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tmp, buf);
  await fs.rename(tmp, dest);
}

async function resolveMealImage(remoteUrl: string): Promise<string> {
  if (!isCacheableMealImageUrl(remoteUrl)) {
    return remoteUrl;
  }

  await fs.mkdir(cacheRoot(), { recursive: true });
  const dest = cacheFilePathForUrl(remoteUrl);

  try {
    await fs.access(dest);
    return pathToFileURL(dest).href;
  } catch {
    /* cache miss */
  }

  let task = inflight.get(remoteUrl);
  if (!task) {
    task = (async () => {
      try {
        await fs.access(dest);
        return pathToFileURL(dest).href;
      } catch {
        /* still missing */
      }
      try {
        await downloadToFile(remoteUrl, dest);
        return pathToFileURL(dest).href;
      } catch {
        return remoteUrl;
      }
    })().finally(() => {
      inflight.delete(remoteUrl);
    });
    inflight.set(remoteUrl, task);
  }
  return task;
}

export function registerMealImageCacheHandlers(): void {
  ipcMain.removeHandler('meal-image-cache:resolve');
  ipcMain.handle('meal-image-cache:resolve', async (_event, url: unknown) => {
    if (typeof url !== 'string' || !url.startsWith('https://')) {
      return typeof url === 'string' ? url : '';
    }
    return resolveMealImage(url);
  });
}
