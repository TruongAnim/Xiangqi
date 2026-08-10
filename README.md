# Xiangqi

Cờ tướng chơi ngay trên trình duyệt, đấu với máy hoặc hai người một máy.
A Xiangqi (Chinese chess) web app built with React, Vite, TypeScript and Tailwind CSS. Play against a
local engine running in a Web Worker, or pass-and-play with someone on the same device.

## Features

- **Full rule enforcement** — cannon screens, elephants held behind the river, horses blocked by the
  leg, the flying-general rule, checkmate, and the stalemate-is-a-loss rule.
- **Draw and repetition rules** — threefold repetition and 60 moves without a capture end the game,
  and a repetition forced by checks alone is scored as a loss for the side giving perpetual check.
  (Perpetual chasing, which Asian rules also forbid, is not enforced.)
- **Engine** — alpha-beta search with MVV-LVA move ordering, killer and history heuristics,
  quiescence search over captures, in-check extensions, and iterative deepening under a hard time
  budget. Three difficulties: Easy plays shallow and picks among plausible moves, Medium searches to
  depth 4, Hard to depth 6.
- **Bilingual** — Vietnamese and English throughout, including move notation: `Pháo 2 bình 5` or
  `C2.5`. Switching language relabels the whole game record.
- **Game record** — move list with capture markers, captured pieces with the material balance,
  take-backs, board flip, per-side clocks, and sound that can be muted.
- **Autosave** — the game in progress is kept in localStorage, so a refresh or a closed tab picks up
  where it left off.

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

Tests cover the rules engine (`src/engine/`), the AI search and evaluation (`src/ai/`), and the game
state reducer and persistence (`src/state/`).

## Project layout

| Path | What lives there |
| --- | --- |
| `src/engine/` | Board representation, FEN, move generation, attack detection, legality, notation |
| `src/ai/` | Evaluation, search, difficulty settings, and the Web Worker wrapper |
| `src/state/` | Game reducer, React context, localStorage persistence |
| `src/components/` | Board rendering and the surrounding UI |
| `src/i18n/` | Vietnamese and English message dictionaries |

## Building for production

```bash
npm run build
npm run preview   # serve the production build locally
```

## Deploying to GitHub Pages

This repo is set up to deploy automatically via GitHub Actions:

1. The repo lives at `TruongAnim/Xiangqi`, so the Vite `base` path in `vite.config.ts` is
   `/Xiangqi/`. Pages URLs are case-sensitive: if you rename the repo, change `base` to match
   exactly, or every asset will 404.
2. In the repo's **Settings → Pages**, set **Source** to **GitHub Actions**.
3. Push to `main` — the `.github/workflows/deploy.yml` workflow builds the app and deploys `dist/` to
   GitHub Pages automatically.
4. The site is served at <https://truonganim.github.io/Xiangqi/>.

To deploy manually instead, trigger the workflow from the **Actions** tab using **Run workflow**
(it's configured with `workflow_dispatch`).
