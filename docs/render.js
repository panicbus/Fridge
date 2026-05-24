import puppeteer from 'puppeteer';
import { createReadStream, existsSync, mkdirSync, statSync } from 'node:fs';
import http from 'node:http';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const TARGETS = {
  'install-guide': {
    html: 'install-guide/install-guide.html',
    output: '../docs-out/Fridge-Install-Guide.pdf',
    format: 'Letter',
  },
  'welcome-booklet': {
    html: 'welcome-booklet/welcome-booklet.html',
    output: '../docs-out/Fridge-Welcome.pdf',
    format: 'Letter',
  },
  'dmg-background': {
    html: 'dmg-background/dmg-background.html',
    output: '../build/dmg-background.png',
    pngSize: { width: 540, height: 380 },
  },
};

function mimeType(absPath) {
  return MIME[extname(absPath).toLowerCase()] ?? 'application/octet-stream';
}

/** Serve `docs/` over http://127.0.0.1 so relative assets (screenshots, CSS) work in headless Chromium. */
function startDocsStaticServer(rootDir) {
  const rootResolved = resolve(rootDir);

  const server = http.createServer((req, res) => {
    if (!req.url) {
      res.writeHead(400);
      res.end();
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`)
        .pathname);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }

    const rel = pathname.replace(/^\/+|\/+$/g, '');
    const absPath = resolve(rootResolved, rel);

    const rootNorm = resolve(rootResolved) + sep;
    const absNorm = resolve(absPath);
    const insideRoot =
      absNorm === resolve(rootResolved) || absNorm.startsWith(rootNorm);

    if (!insideRoot || !existsSync(absPath)) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    if (!statSync(absPath).isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    res.setHeader('Content-Type', mimeType(absPath));

    createReadStream(absPath)
      .on('error', () => {
        if (!res.headersSent) res.writeHead(500);
        res.end();
      })
      .pipe(res);
  });

  return new Promise((resolvePromise, rejectPromise) => {
    server.once('error', rejectPromise);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close();
        rejectPromise(new Error('Static server bind failed'));
        return;
      }
      resolvePromise({
        origin: `http://127.0.0.1:${addr.port}`,
        /** @returns {Promise<void>} */
        close: () =>
          new Promise((r, rej) =>
            server.close((err) => (err ? rej(err) : r())),
          ),
      });
    });
  });
}

async function renderTarget(name) {
  const target = TARGETS[name];
  if (!target) {
    console.error(`Unknown target: ${name}`);
    process.exit(1);
  }

  let serverCtx;
  const browser = await puppeteer.launch({
    args: [
      '--font-render-hinting=none',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--allow-file-access-from-files',
    ],
    headless: true,
  });

  try {
    serverCtx = await startDocsStaticServer(__dirname);

    const pageUrl = new URL(
      target.html.replace(/\\/g, '/'),
      `${serverCtx.origin}/`,
    ).href;

    const page = await browser.newPage();

    const waitUntil = target.pngSize ? 'domcontentloaded' : 'networkidle0';
    await page.goto(pageUrl, { waitUntil });

    const outputPath = resolve(__dirname, target.output);
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

    if (target.pngSize) {
      await page.setViewport({
        ...target.pngSize,
        deviceScaleFactor: 1,
      });
      await page.screenshot({
        path: outputPath,
        type: 'png',
        omitBackground: false,
      });
    } else {
      await page.pdf({
        path: outputPath,
        format: target.format,
        printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
      });
    }

    console.log(`Rendered ${name} -> ${outputPath}`);
  } finally {
    await browser.close().catch(() => {});
    if (serverCtx) await serverCtx.close().catch(() => {});
  }
}

async function main() {
  const arg = process.argv[2];
  if (arg) {
    await renderTarget(arg);
    return;
  }
  const names = Object.keys(TARGETS);
  for (const name of names) {
    await renderTarget(name);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
