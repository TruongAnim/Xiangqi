# Xiangqi Web

A Xiangqi (Chinese Chess) web app built with React, Vite, TypeScript, and Tailwind CSS. Play against a local AI (Easy/Medium/Hard, running in a Web Worker) or pass-and-play with another person on the same device.

## Features

- Full Xiangqi rule enforcement: cannon-mount captures, elephant river boundary, horse leg-blocking, flying general rule, checkmate and no-legal-move detection.
- Play vs AI at three difficulty levels, or local pass & play.
- Move history, undo, per-side countdown clocks with selectable time controls, check/checkmate/timeout alerts, and move sound effects.

## Local development

```bash
npm install
npm run dev
```

Open the printed local URL in your browser.

## Running tests

```bash
npm run test        # run once
npm run test:watch  # watch mode
```

Tests cover the rules engine (`src/engine/`) and the AI search (`src/ai/`).

## Building for production

```bash
npm run build
npm run preview   # serve the production build locally
```

## Deploying to GitHub Pages

This repo is set up to deploy automatically via GitHub Actions:

1. Push this repo to GitHub as `xiangqi-web` (the Vite `base` path in `vite.config.ts` is set to `/xiangqi-web/` to match).
2. In the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main` — the `.github/workflows/deploy.yml` workflow builds the app and deploys `dist/` to GitHub Pages automatically.
4. The site will be available at `https://<your-username>.github.io/xiangqi-web/`.

To deploy manually instead, trigger the workflow from the **Actions** tab using **Run workflow** (it's configured with `workflow_dispatch`).
