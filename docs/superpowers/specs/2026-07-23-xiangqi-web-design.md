# Xiangqi Web App — Design Spec

Date: 2026-07-23

## Goal

A modern, responsive Xiangqi (Chinese Chess) web app, deployed as a static site
on GitHub Pages. Supports Play vs AI (Easy/Medium/Hard) and local Pass & Play
vs a human, with full rule enforcement, move history, timers, undo, and sound
effects.

## Tech Stack

- React + Vite + TypeScript (existing scaffold).
- Tailwind CSS v4, added via the `@tailwindcss/vite` plugin (no separate
  PostCSS config file needed).
- Vitest for unit tests on the rules engine (`src/engine/`). This is the one
  part of the app where correctness bugs are subtle and expensive (illegal
  moves, missed checkmates), so it gets test coverage even though the rest of
  the app does not.
- No external state management library — a single `useReducer` + Context
  covers the one game-state object the app needs.
- `oxlint` stays as the linter, unchanged.

## Repository Layout

```
src/
  engine/           # pure game-rules logic, no React/DOM deps
    board.ts         # board representation, coordinates, start position
    pieces.ts        # per-piece pseudo-legal move generation
    rules.ts         # legality filtering, check/checkmate/flying-general
    moveNotation.ts   # move -> coordinate notation string
    engine.test.ts    # Vitest coverage for the above
  ai/
    evaluate.ts       # material + piece-square-table evaluation
    search.ts         # minimax + alpha-beta + iterative deepening
    worker.ts         # Web Worker entry point
    engine.ts         # XiangqiEngine interface + worker-backed implementation
  state/
    gameReducer.ts    # actions, reducer, initial state
    GameProvider.tsx  # Context provider wrapping the reducer
  components/
    Board.tsx
    Square.tsx
    Piece.tsx
    Clock.tsx
    MoveHistory.tsx
    Controls.tsx
    GameSetup.tsx     # pre-game screen: mode + difficulty + time control
    StatusBanner.tsx  # check / checkmate / timeout alerts
  hooks/
    useAIMove.ts      # talks to the AI worker, dispatches the resulting move
  sound/
    sound.ts          # Web Audio API oscillator-based effects
  App.tsx
.github/
  workflows/
    deploy.yml
```

## Rules Engine (`src/engine/`)

Framework-agnostic TypeScript, unit-tested with Vitest.

- **Board**: 9 columns × 10 rows, flat array representation. A simple
  string-based position notation (FEN-like) is used both for the initial
  position and for serializing state sent to the AI worker.
- **Piece movement** (`pieces.ts`), each returning pseudo-legal destinations
  (before check-filtering):
  - General: 1 step orthogonal, confined to the 3×3 palace.
  - Advisor: 1 step diagonal, confined to the palace.
  - Elephant: exactly 2 steps diagonal, cannot cross the river, blocked if the
    intervening "elephant eye" square is occupied.
  - Horse: standard L-move, blocked if the orthogonal "leg" square adjacent to
    it is occupied (hobbling the horse's leg).
  - Chariot: any distance orthogonally, blocked by the first piece in its path.
  - Cannon: moves like a Chariot when not capturing; to capture, must jump
    over exactly one piece (of either color) as a "screen".
  - Soldier: 1 step forward only before crossing the river; forward or
    sideways (never backward) after crossing.
- **Legality filtering** (`rules.ts`):
  - A pseudo-legal move is illegal if it leaves the mover's own General in
    check.
  - **Flying General rule**: the two Generals may never face each other on a
    fully open file (no pieces between them) — a move that would create this
    is illegal, and this is also itself a way to give check.
  - Check detection: is a given side's General attacked by any opposing
    piece's pseudo-legal moves.
  - Checkmate: in check, and no legal move escapes it.
  - No-legal-moves-while-not-in-check: this is a **loss** for the side to
    move in Xiangqi (unlike stalemate = draw in Western chess). This is
    intentionally different from chess and called out explicitly so it isn't
    "fixed" later by mistake.
- **Out of scope for v1**: draw-by-repetition / perpetual-check detection.
  Games are decided by checkmate, no-legal-moves loss, or timeout. Noted as a
  future enhancement.

## AI Engine (`src/ai/`)

- Runs entirely inside a **Web Worker** so search never blocks the UI thread.
- `evaluate.ts`: material values per piece type + positional piece-square
  tables (e.g. Horses/Cannons more valuable centrally, Soldiers more valuable
  after crossing the river).
- `search.ts`: minimax with alpha-beta pruning, iterative deepening bounded by
  a time budget (rather than a fixed depth) so search quality scales with
  available time.
- `worker.ts`: message-based entry point — receives `{ position, difficulty
  }`, returns `{ move }`.
- `engine.ts`: exposes
  ```ts
  interface XiangqiEngine {
    requestMove(position: string, difficulty: Difficulty): Promise<Move>
  }
  ```
  The worker-backed implementation is the only one built now, but this
  interface is the intended seam for swapping in a Pikafish-WASM-backed
  implementation later without touching UI or rules-engine code.
- **Difficulty mapping**:
  - Easy: shallow search depth, plus intentional randomness — picks among the
    top few candidate moves rather than always the best, so it plays
    plausibly but makes real mistakes.
  - Medium: moderate fixed depth, always plays the engine's top move.
  - Hard: iterative deepening within a ~1–2 second time budget per move.

## State Management (`src/state/`)

Single reducer-driven game state:

```ts
interface GameState {
  position: string             // current board position
  turn: 'red' | 'black'
  history: Move[]              // for move list + undo
  mode: 'vs-ai' | 'local'
  difficulty: 'easy' | 'medium' | 'hard' | null
  clocks: { red: number; black: number } | null  // ms remaining, null = no limit
  status: 'setup' | 'playing' | 'check' | 'checkmate' | 'timeout'
  winner: 'red' | 'black' | null
}
```

- **Undo**: in `vs-ai` mode, pops the last 2 plies (the AI's reply and the
  human's move before it) so it becomes the human's turn again. In `local`
  mode, pops 1 ply.
- **Timer**: pre-game setup screen offers presets (5 / 10 / 20 min per side,
  or "No limit"). A running countdown ticks for the side to move; hitting 0
  ends the game as a loss for that side. No per-move increment.
- **Board orientation**: fixed by default (Red at the bottom); a "Flip Board"
  control in `Controls.tsx` lets either player flip the view, useful for
  local pass-and-play.

## UI Components (`src/components/`)

- `Board.tsx`: SVG-rendered 9×10 grid — board lines, the river gap, and the
  palace diagonals drawn as SVG paths. Pieces are SVG circles with the
  Chinese character rendered as text inside, styled red vs black ink.
  Click-to-select then click-to-move interaction; selected piece's legal
  destinations shown as highlighted dots; last move's from/to squares
  highlighted; the General is highlighted when in check.
- `MoveHistory.tsx`: scrollable list of moves in simple coordinate notation
  (e.g. `(2,7)->(2,4)`), one row per ply, grouped by move number.
- `Clock.tsx`: per-side countdown display, active side's clock visually
  emphasized.
- `Controls.tsx`: Undo, New Game, Flip Board.
- `GameSetup.tsx`: pre-game screen to choose mode (vs AI / local), AI
  difficulty (if vs AI), and time control preset.
- `StatusBanner.tsx`: non-blocking banner/toast for check, checkmate, and
  timeout — not a blocking `window.alert()`.
- `sound/sound.ts`: Web Audio API oscillator + gain-envelope tones for move,
  capture, check, and game-end — no external audio assets to source or
  license.

## Deployment

- `vite.config.ts`: add `base: '/xiangqi-web/'` (matches the GitHub repo name
  `xiangqi-web`), plus the Tailwind Vite plugin alongside the existing React
  plugin.
- `.github/workflows/deploy.yml`: on push to `main`, install deps, run
  `npm run build`, deploy the `dist/` output via `actions/upload-pages-artifact`
  + `actions/deploy-pages`.
- README updated with: local dev commands, and the one-time repo setting
  (Settings → Pages → Source: GitHub Actions) plus how the workflow
  auto-deploys on every push to `main`.

## Testing

- Vitest unit tests for `src/engine/`: per-piece move generation (including
  the elephant-eye and horse-leg blocking cases), check detection, flying
  general rule, checkmate detection, and the no-legal-moves-is-a-loss rule.
- No UI/component test suite in v1 (kept out of scope to match project size);
  manual verification of the running app in a browser is the check for UI
  behavior.

## Explicitly Out of Scope for v1

- Pikafish WASM integration (interface designed for it, not implemented).
- Draw by repetition / perpetual check detection.
- Online multiplayer.
- Persisting game state across page reloads (localStorage).
