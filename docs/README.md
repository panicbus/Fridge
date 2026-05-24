Static HTML/CSS for printable PDFs plus the DMG window background PNG. Screenshots belong in [`screenshots/`](./screenshots/); filenames are referenced from `welcome-booklet/welcome-booklet.html`.

`render.js` starts a tiny static server at `127.0.0.1` and opens each HTML via `http://` so images and stylesheets resolve correctly (Chrome blocks many `file://` cross-requests even with flags).

First-time setup runs `puppeteer browsers install chrome` from **`postinstall`** so the headless Chromium exists under `~/.cache/puppeteer`. If Chrome is missing, run `npm install` again in **`docs/`** or **`npx puppeteer browsers install chrome`**.
