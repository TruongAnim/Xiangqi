# Xiangqi Web App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Xiangqi (Chinese Chess) web app with a full rules engine, a Web-Worker-based minimax AI (Easy/Medium/Hard), local pass-and-play, timers, undo, sound, and GitHub Pages deployment.

**Architecture:** A pure, framework-agnostic rules engine (`src/engine/`) is the single source of truth for legal moves and game status. A pure AI engine (`src/ai/`) runs minimax + alpha-beta search inside a Web Worker behind a small `XiangqiEngine` interface, so the worker-backed implementation can later be swapped for a Pikafish-WASM implementation without touching UI code. React state is a single `useReducer` (`src/state/gameReducer.ts`) consumed via Context. UI components are presentational and dispatch actions; they never contain game rules.

**Tech Stack:** React 19 + Vite + TypeScript (existing scaffold), Tailwind CSS v4 (`@tailwindcss/vite`), Vitest for engine/AI unit tests, native Web Audio API for sound, GitHub Actions for deployment.

## Global Constraints

- Board is 9 columns × 10 rows. Column 0-8, row 0 = black's back rank (top), row 9 = red's back rank (bottom).
- River: a row is "crossed" for black when `row >= 5`, for red when `row <= 4`.
- Palace: columns 3-5; rows 0-2 for black, rows 7-9 for red.
- Position serialization uses a Xiangqi FEN-style string: `r/n/b/a/k/c/p` for black pieces (chariot/horse/elephant/advisor/general/cannon/soldier), uppercase for red, digits for consecutive empty squares, ranks separated by `/`, top rank first. Start position: `rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR`.
- No legal moves while in check = checkmate. No legal moves while **not** in check = an immediate loss for the side to move (this is intentionally different from chess stalemate — do not "fix" it to be a draw).
- Draw-by-repetition, Pikafish WASM, online multiplayer, and localStorage persistence are explicitly out of scope for this plan (see spec).
- Repo name is `xiangqi-web`; Vite `base` must be `/xiangqi-web/`.
- Vitest tests are required for everything under `src/engine/` and `src/ai/`. UI components (`src/components/`, `src/state/`) are verified manually in the browser, per the approved spec.

Spec reference: `docs/superpowers/specs/2026-07-23-xiangqi-web-design.md`

---

### Task 1: Project setup — Tailwind v4 + Vitest, remove template boilerplate

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Modify: `vite.config.ts`
- Modify: `src/index.css`
- Delete: `src/App.css`
- Delete: `src/assets/react.svg`, `src/assets/vite.svg`, `src/assets/hero.png`

**Interfaces:**
- Produces: `npm run test` (runs Vitest once), `npm run test:watch` (Vitest watch mode), Tailwind utility classes available in any `.tsx` file via `@import "tailwindcss"` in `src/index.css`.

- [ ] **Step 1: Install Tailwind v4 and Vitest**

```bash
npm install -D tailwindcss @tailwindcss/vite vitest
```

- [ ] **Step 2: Add the Tailwind Vite plugin**

Edit `vite.config.ts` to:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/xiangqi-web/',
  plugins: [react(), tailwindcss()],
})
```

- [ ] **Step 3: Replace `src/index.css` with the Tailwind import**

Replace the entire file contents with:

```css
@import "tailwindcss";
```

- [ ] **Step 4: Remove unused template files**

```bash
rm src/App.css src/assets/react.svg src/assets/vite.svg src/assets/hero.png
```

(These are only referenced by the current `src/App.tsx`, which Task 18 will fully rewrite. Leaving the imports dangling until Task 18 is fine — Task 18 removes them in the same change that removes the files' only usages. If you'd rather avoid a broken intermediate state, you may also stub `src/App.tsx` down to `export default function App() { return null }` in this task; either order is fine.)

- [ ] **Step 5: Add a standalone Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
})
```

- [ ] **Step 6: Add test scripts to `package.json`**

Add to the `"scripts"` section:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 7: Verify the dev server and test runner both start cleanly**

```bash
npm run test
```
Expected: `No test files found` (no test files exist yet — this is expected, confirms Vitest itself runs).

```bash
npm run build
```
Expected: build succeeds (this will fail once `App.tsx` still imports deleted assets and you didn't stub it — if so, apply the stub from Step 4 now).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: add Tailwind v4 and Vitest, remove template boilerplate"
```

---

### Task 2: Engine — board representation (`src/engine/board.ts`)

**Files:**
- Create: `src/engine/board.ts`
- Test: `src/engine/board.test.ts`

**Interfaces:**
- Produces: `Color = 'red' | 'black'`, `PieceType`, `Piece { type, color }`, `Coord { col, row }`, `Move { from: Coord, to: Coord }`, `Board = (Piece | null)[]`, `BOARD_COLS = 9`, `BOARD_ROWS = 10`, `coordToIndex(coord): number`, `indexToCoord(index): Coord`, `inBounds(coord): boolean`, `START_POSITION_FEN: string`, `parseFen(fen): Board`, `boardToFen(board): string`, `createStartBoard(): Board`, `applyMove(board, move): Board`.

- [ ] **Step 1: Write the failing tests**

Create `src/engine/board.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  applyMove,
  boardToFen,
  coordToIndex,
  createStartBoard,
  indexToCoord,
  parseFen,
  START_POSITION_FEN,
} from './board'

describe('board', () => {
  it('parses the start position FEN into 32 pieces', () => {
    const board = createStartBoard()
    const pieceCount = board.filter((square) => square !== null).length
    expect(pieceCount).toBe(32)
  })

  it('round-trips the start position through boardToFen', () => {
    const board = createStartBoard()
    expect(boardToFen(board)).toBe(START_POSITION_FEN)
  })

  it('places the red general at (4,9) and black general at (4,0)', () => {
    const board = createStartBoard()
    expect(board[coordToIndex({ col: 4, row: 9 })]).toEqual({ type: 'general', color: 'red' })
    expect(board[coordToIndex({ col: 4, row: 0 })]).toEqual({ type: 'general', color: 'black' })
  })

  it('converts between coord and index consistently', () => {
    const coord = { col: 3, row: 7 }
    expect(indexToCoord(coordToIndex(coord))).toEqual(coord)
  })

  it('applyMove moves a piece and clears the origin square', () => {
    const board = createStartBoard()
    const from = { col: 0, row: 6 } // red soldier
    const to = { col: 0, row: 5 }
    const next = applyMove(board, { from, to })
    expect(next[coordToIndex(from)]).toBeNull()
    expect(next[coordToIndex(to)]).toEqual({ type: 'soldier', color: 'red' })
  })

  it('parseFen of an all-empty board produces no pieces', () => {
    const board = parseFen('9/9/9/9/9/9/9/9/9/9')
    expect(board.every((square) => square === null)).toBe(true)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/engine/board.test.ts
```
Expected: FAIL — `board.ts` does not exist / has no exports.

- [ ] **Step 3: Implement `src/engine/board.ts`**

```ts
export type Color = 'red' | 'black'

export type PieceType =
  | 'general'
  | 'advisor'
  | 'elephant'
  | 'horse'
  | 'chariot'
  | 'cannon'
  | 'soldier'

export interface Piece {
  type: PieceType
  color: Color
}

export interface Coord {
  col: number // 0-8
  row: number // 0-9, 0 = black back rank, 9 = red back rank
}

export interface Move {
  from: Coord
  to: Coord
}

export type Board = (Piece | null)[] // length 90, index = row * BOARD_COLS + col

export const BOARD_COLS = 9
export const BOARD_ROWS = 10

export function coordToIndex(coord: Coord): number {
  return coord.row * BOARD_COLS + coord.col
}

export function indexToCoord(index: number): Coord {
  return { col: index % BOARD_COLS, row: Math.floor(index / BOARD_COLS) }
}

export function inBounds(coord: Coord): boolean {
  return coord.col >= 0 && coord.col < BOARD_COLS && coord.row >= 0 && coord.row < BOARD_ROWS
}

const FEN_TO_PIECE: Record<string, PieceType> = {
  r: 'chariot',
  n: 'horse',
  b: 'elephant',
  a: 'advisor',
  k: 'general',
  c: 'cannon',
  p: 'soldier',
}

const PIECE_TO_FEN: Record<PieceType, string> = {
  chariot: 'r',
  horse: 'n',
  elephant: 'b',
  advisor: 'a',
  general: 'k',
  cannon: 'c',
  soldier: 'p',
}

export const START_POSITION_FEN =
  'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR'

export function parseFen(fen: string): Board {
  const board: Board = new Array(BOARD_COLS * BOARD_ROWS).fill(null)
  const rows = fen.split('/')
  rows.forEach((rowStr, row) => {
    let col = 0
    for (const ch of rowStr) {
      if (/[0-9]/.test(ch)) {
        col += Number(ch)
      } else {
        const type = FEN_TO_PIECE[ch.toLowerCase()]
        const color: Color = ch === ch.toLowerCase() ? 'black' : 'red'
        board[coordToIndex({ col, row })] = { type, color }
        col += 1
      }
    }
  })
  return board
}

export function boardToFen(board: Board): string {
  const rows: string[] = []
  for (let row = 0; row < BOARD_ROWS; row++) {
    let rowStr = ''
    let empty = 0
    for (let col = 0; col < BOARD_COLS; col++) {
      const piece = board[coordToIndex({ col, row })]
      if (!piece) {
        empty += 1
        continue
      }
      if (empty > 0) {
        rowStr += String(empty)
        empty = 0
      }
      const ch = PIECE_TO_FEN[piece.type]
      rowStr += piece.color === 'red' ? ch.toUpperCase() : ch
    }
    if (empty > 0) rowStr += String(empty)
    rows.push(rowStr)
  }
  return rows.join('/')
}

export function createStartBoard(): Board {
  return parseFen(START_POSITION_FEN)
}

export function applyMove(board: Board, move: Move): Board {
  const next = board.slice()
  const fromIndex = coordToIndex(move.from)
  const toIndex = coordToIndex(move.to)
  next[toIndex] = next[fromIndex]
  next[fromIndex] = null
  return next
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run src/engine/board.test.ts
```
Expected: all 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/board.ts src/engine/board.test.ts
git commit -m "feat: add Xiangqi board representation and FEN parsing"
```

---

### Task 3: Engine — piece move generation (`src/engine/pieces.ts`)

**Files:**
- Create: `src/engine/pieces.ts`
- Test: `src/engine/pieces.test.ts`

**Interfaces:**
- Consumes: everything from Task 2 (`Board`, `Coord`, `Piece`, `Move`, `Color`, `coordToIndex`, `inBounds`, `parseFen`, `BOARD_COLS`, `BOARD_ROWS`).
- Produces: `pseudoLegalMoves(board, from): Move[]`, `allPseudoLegalMoves(board, color): Move[]`, `hasCrossedRiver(coord, color): boolean` (also used by Task 6's evaluator), `isPalace(coord, color): boolean`.

- [ ] **Step 1: Write the failing tests**

Create `src/engine/pieces.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseFen } from './board'
import { pseudoLegalMoves } from './pieces'

describe('pieces', () => {
  it('general moves one step orthogonally within the palace', () => {
    const board = parseFen('9/9/9/9/9/9/9/9/9/4K4')
    const moves = pseudoLegalMoves(board, { col: 4, row: 9 })
    expect(moves.map((m) => m.to)).toEqual(
      expect.arrayContaining([
        { col: 4, row: 8 },
        { col: 3, row: 9 },
        { col: 5, row: 9 },
      ]),
    )
    expect(moves).toHaveLength(3)
  })

  it('elephant cannot cross the river', () => {
    const board = parseFen('9/9/9/9/9/4B4/9/9/9/9')
    const moves = pseudoLegalMoves(board, { col: 4, row: 5 })
    expect(moves.some((m) => m.to.row < 5)).toBe(false)
  })

  it('elephant is blocked by an occupied elephant eye', () => {
    const board = parseFen('9/9/9/9/9/9/9/9/1P7/2B6')
    const moves = pseudoLegalMoves(board, { col: 2, row: 9 })
    expect(moves.some((m) => m.to.col === 0 && m.to.row === 7)).toBe(false)
  })

  it('horse is blocked by an occupied leg square', () => {
    const board = parseFen('9/9/9/9/9/9/9/9/4P4/4N4')
    const moves = pseudoLegalMoves(board, { col: 4, row: 9 })
    expect(moves.some((m) => m.to.row === 7)).toBe(false)
  })

  it('horse moves normally when the leg is clear', () => {
    const board = parseFen('9/9/9/9/9/9/9/9/9/4N4')
    const moves = pseudoLegalMoves(board, { col: 4, row: 9 })
    expect(moves.map((m) => m.to)).toEqual(
      expect.arrayContaining([
        { col: 3, row: 7 },
        { col: 5, row: 7 },
        { col: 2, row: 8 },
        { col: 6, row: 8 },
      ]),
    )
  })

  it('cannon must jump exactly one screen piece to capture', () => {
    const board = parseFen('r8/9/9/9/9/p8/9/9/9/C8')
    const moves = pseudoLegalMoves(board, { col: 0, row: 9 })
    expect(moves.some((m) => m.to.col === 0 && m.to.row === 0)).toBe(true)
  })

  it('cannon cannot capture without a screen piece', () => {
    const board = parseFen('r8/9/9/9/9/9/9/9/9/C8')
    const moves = pseudoLegalMoves(board, { col: 0, row: 9 })
    expect(moves.some((m) => m.to.col === 0 && m.to.row === 0)).toBe(false)
  })

  it('soldier moves forward only before crossing the river', () => {
    const board = parseFen('9/9/9/9/9/9/P8/9/9/9')
    const moves = pseudoLegalMoves(board, { col: 0, row: 6 })
    expect(moves).toEqual([{ from: { col: 0, row: 6 }, to: { col: 0, row: 5 } }])
  })

  it('soldier gains sideways moves after crossing the river', () => {
    const board = parseFen('9/9/9/9/1P7/9/9/9/9/9')
    const moves = pseudoLegalMoves(board, { col: 1, row: 4 })
    expect(moves.map((m) => m.to)).toEqual(
      expect.arrayContaining([
        { col: 1, row: 3 },
        { col: 0, row: 4 },
        { col: 2, row: 4 },
      ]),
    )
    expect(moves).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/engine/pieces.test.ts
```
Expected: FAIL — `pieces.ts` does not exist.

- [ ] **Step 3: Implement `src/engine/pieces.ts`**

```ts
import { Board, Coord, Piece, Color, Move, coordToIndex, inBounds } from './board'

function pieceAt(board: Board, coord: Coord): Piece | null {
  if (!inBounds(coord)) return null
  return board[coordToIndex(coord)]
}

export function isPalace(coord: Coord, color: Color): boolean {
  if (coord.col < 3 || coord.col > 5) return false
  return color === 'black' ? coord.row >= 0 && coord.row <= 2 : coord.row >= 7 && coord.row <= 9
}

export function hasCrossedRiver(coord: Coord, color: Color): boolean {
  return color === 'black' ? coord.row >= 5 : coord.row <= 4
}

function canLandOn(board: Board, coord: Coord, color: Color): boolean {
  if (!inBounds(coord)) return false
  const occupant = pieceAt(board, coord)
  return !occupant || occupant.color !== color
}

function generalMoves(board: Board, from: Coord, color: Color): Coord[] {
  const deltas = [
    { col: 0, row: -1 },
    { col: 0, row: 1 },
    { col: -1, row: 0 },
    { col: 1, row: 0 },
  ]
  return deltas
    .map((d) => ({ col: from.col + d.col, row: from.row + d.row }))
    .filter((to) => isPalace(to, color) && canLandOn(board, to, color))
}

function advisorMoves(board: Board, from: Coord, color: Color): Coord[] {
  const deltas = [
    { col: -1, row: -1 },
    { col: 1, row: -1 },
    { col: -1, row: 1 },
    { col: 1, row: 1 },
  ]
  return deltas
    .map((d) => ({ col: from.col + d.col, row: from.row + d.row }))
    .filter((to) => isPalace(to, color) && canLandOn(board, to, color))
}

function elephantMoves(board: Board, from: Coord, color: Color): Coord[] {
  const deltas = [
    { col: -2, row: -2 },
    { col: 2, row: -2 },
    { col: -2, row: 2 },
    { col: 2, row: 2 },
  ]
  const moves: Coord[] = []
  for (const d of deltas) {
    const to = { col: from.col + d.col, row: from.row + d.row }
    const eye = { col: from.col + d.col / 2, row: from.row + d.row / 2 }
    if (!inBounds(to)) continue
    if (hasCrossedRiver(to, color)) continue
    if (pieceAt(board, eye)) continue
    if (canLandOn(board, to, color)) moves.push(to)
  }
  return moves
}

const HORSE_MOVES = [
  { d: { col: 1, row: 2 }, leg: { col: 0, row: 1 } },
  { d: { col: -1, row: 2 }, leg: { col: 0, row: 1 } },
  { d: { col: 1, row: -2 }, leg: { col: 0, row: -1 } },
  { d: { col: -1, row: -2 }, leg: { col: 0, row: -1 } },
  { d: { col: 2, row: 1 }, leg: { col: 1, row: 0 } },
  { d: { col: 2, row: -1 }, leg: { col: 1, row: 0 } },
  { d: { col: -2, row: 1 }, leg: { col: -1, row: 0 } },
  { d: { col: -2, row: -1 }, leg: { col: -1, row: 0 } },
]

function horseMoves(board: Board, from: Coord, color: Color): Coord[] {
  const moves: Coord[] = []
  for (const { d, leg } of HORSE_MOVES) {
    const to = { col: from.col + d.col, row: from.row + d.row }
    const legCoord = { col: from.col + leg.col, row: from.row + leg.row }
    if (!inBounds(to)) continue
    if (pieceAt(board, legCoord)) continue
    if (canLandOn(board, to, color)) moves.push(to)
  }
  return moves
}

const ORTHOGONAL_DIRECTIONS = [
  { col: 0, row: -1 },
  { col: 0, row: 1 },
  { col: -1, row: 0 },
  { col: 1, row: 0 },
]

function chariotMoves(board: Board, from: Coord, color: Color): Coord[] {
  const moves: Coord[] = []
  for (const dir of ORTHOGONAL_DIRECTIONS) {
    let to = { col: from.col + dir.col, row: from.row + dir.row }
    while (inBounds(to)) {
      const occupant = pieceAt(board, to)
      if (!occupant) {
        moves.push(to)
      } else {
        if (occupant.color !== color) moves.push(to)
        break
      }
      to = { col: to.col + dir.col, row: to.row + dir.row }
    }
  }
  return moves
}

function cannonMoves(board: Board, from: Coord, color: Color): Coord[] {
  const moves: Coord[] = []
  for (const dir of ORTHOGONAL_DIRECTIONS) {
    let to = { col: from.col + dir.col, row: from.row + dir.row }
    let screenFound = false
    while (inBounds(to)) {
      const occupant = pieceAt(board, to)
      if (!screenFound) {
        if (!occupant) {
          moves.push(to)
        } else {
          screenFound = true
        }
      } else if (occupant) {
        if (occupant.color !== color) moves.push(to)
        break
      }
      to = { col: to.col + dir.col, row: to.row + dir.row }
    }
  }
  return moves
}

function soldierMoves(board: Board, from: Coord, color: Color): Coord[] {
  const forward = color === 'black' ? 1 : -1
  const moves: Coord[] = []
  const forwardCoord = { col: from.col, row: from.row + forward }
  if (canLandOn(board, forwardCoord, color)) moves.push(forwardCoord)
  if (hasCrossedRiver(from, color)) {
    const left = { col: from.col - 1, row: from.row }
    const right = { col: from.col + 1, row: from.row }
    if (canLandOn(board, left, color)) moves.push(left)
    if (canLandOn(board, right, color)) moves.push(right)
  }
  return moves
}

function pseudoDestinations(board: Board, from: Coord, piece: Piece): Coord[] {
  switch (piece.type) {
    case 'general':
      return generalMoves(board, from, piece.color)
    case 'advisor':
      return advisorMoves(board, from, piece.color)
    case 'elephant':
      return elephantMoves(board, from, piece.color)
    case 'horse':
      return horseMoves(board, from, piece.color)
    case 'chariot':
      return chariotMoves(board, from, piece.color)
    case 'cannon':
      return cannonMoves(board, from, piece.color)
    case 'soldier':
      return soldierMoves(board, from, piece.color)
  }
}

export function pseudoLegalMoves(board: Board, from: Coord): Move[] {
  const piece = pieceAt(board, from)
  if (!piece) return []
  return pseudoDestinations(board, from, piece).map((to) => ({ from, to }))
}

export function allPseudoLegalMoves(board: Board, color: Color): Move[] {
  const moves: Move[] = []
  board.forEach((piece, index) => {
    if (piece && piece.color === color) {
      const from = { col: index % 9, row: Math.floor(index / 9) }
      moves.push(...pseudoLegalMoves(board, from))
    }
  })
  return moves
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run src/engine/pieces.test.ts
```
Expected: all 9 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/pieces.ts src/engine/pieces.test.ts
git commit -m "feat: add per-piece pseudo-legal move generation"
```

---

### Task 4: Engine — legality, check, checkmate, flying general (`src/engine/rules.ts`)

**Files:**
- Create: `src/engine/rules.ts`
- Test: `src/engine/rules.test.ts`

**Interfaces:**
- Consumes: `Board`, `Color`, `Coord`, `Move`, `coordToIndex`, `indexToCoord`, `applyMove` (Task 2); `allPseudoLegalMoves`, `pseudoLegalMoves` (Task 3).
- Produces: `GameStatus = 'playing' | 'check' | 'checkmate' | 'no-moves-loss'`, `isInCheck(board, color): boolean`, `generalsFacing(board): boolean`, `isLegalMove(board, move, color): boolean`, `legalMovesFrom(board, from): Move[]`, `allLegalMoves(board, color): Move[]`, `getGameStatus(board, colorToMove): GameStatus`.
- **Invariant:** every function here assumes both generals are present on the board. This always holds in real games (a game ends at `checkmate`/`no-moves-loss` the ply before a general could ever be captured). Do not construct test boards where a legal move captures a general.

- [ ] **Step 1: Write the failing tests**

Create `src/engine/rules.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseFen } from './board'
import { pseudoLegalMoves } from './pieces'
import { generalsFacing, getGameStatus, isInCheck, legalMovesFrom } from './rules'

describe('rules', () => {
  it('detects check from a chariot with a clear line to the general', () => {
    const board = parseFen('4k4/9/9/9/9/4R4/9/9/9/9')
    expect(isInCheck(board, 'black')).toBe(true)
  })

  it('generalsFacing is true when the two generals share an open file', () => {
    const board = parseFen('4k4/9/9/9/9/9/9/9/9/4K4')
    expect(generalsFacing(board)).toBe(true)
  })

  it('generalsFacing is false when a piece stands between the generals', () => {
    const board = parseFen('4k4/9/9/9/4A4/9/9/9/9/4K4')
    expect(generalsFacing(board)).toBe(false)
  })

  it('rejects a move that would remove the only piece screening the two generals', () => {
    // A horse sitting between the generals on file 4 can never stay on that file when it
    // moves (horse moves always change column), so every one of its moves would expose
    // the generals face to face and must be filtered out as illegal.
    const board = parseFen('4k4/9/9/9/4N4/9/9/9/9/4K4')
    const pseudo = pseudoLegalMoves(board, { col: 4, row: 4 })
    expect(pseudo.length).toBeGreaterThan(0)
    const legal = legalMovesFrom(board, { col: 4, row: 4 })
    expect(legal).toHaveLength(0)
  })

  it('a move must resolve an existing check, not just avoid creating a new one', () => {
    // Black chariot already checks the red general along the open file. Moving the
    // unrelated red soldier does nothing to address that check, so it must be illegal.
    const board = parseFen('4r4/9/9/9/9/9/P8/9/9/4K4')
    const moves = legalMovesFrom(board, { col: 0, row: 6 })
    expect(moves).toHaveLength(0)
  })

  it('detects checkmate when the general is boxed into a palace corner', () => {
    // Black general in the corner of its palace. One red chariot checks it directly
    // along file 3; a second red chariot on rank 0 covers the only other escape square.
    const board = parseFen('3k4C/9/9/9/9/3R5/9/9/9/4K4')
    expect(getGameStatus(board, 'black')).toBe('checkmate')
  })

  it('detects a no-legal-moves loss when the general is not in check but has no safe move', () => {
    // Black general has no attacker on its current square, but both red horses cover
    // every one of its three flight squares, and it has no other piece to move.
    const board = parseFen('4k4/9/2N3N2/9/9/9/9/9/9/4K4')
    expect(getGameStatus(board, 'black')).toBe('no-moves-loss')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/engine/rules.test.ts
```
Expected: FAIL — `rules.ts` does not exist.

- [ ] **Step 3: Implement `src/engine/rules.ts`**

```ts
import { Board, Color, Coord, Move, applyMove, coordToIndex, indexToCoord } from './board'
import { allPseudoLegalMoves, pseudoLegalMoves } from './pieces'

function findGeneral(board: Board, color: Color): Coord {
  const index = board.findIndex((piece) => piece?.type === 'general' && piece.color === color)
  if (index === -1) throw new Error(`No ${color} general on board`)
  return indexToCoord(index)
}

function opponent(color: Color): Color {
  return color === 'red' ? 'black' : 'red'
}

export function isInCheck(board: Board, color: Color): boolean {
  const generalIndex = coordToIndex(findGeneral(board, color))
  const opponentMoves = allPseudoLegalMoves(board, opponent(color))
  return opponentMoves.some((move) => coordToIndex(move.to) === generalIndex)
}

export function generalsFacing(board: Board): boolean {
  const redGeneral = findGeneral(board, 'red')
  const blackGeneral = findGeneral(board, 'black')
  if (redGeneral.col !== blackGeneral.col) return false
  const [top, bottom] =
    redGeneral.row < blackGeneral.row ? [redGeneral, blackGeneral] : [blackGeneral, redGeneral]
  for (let row = top.row + 1; row < bottom.row; row++) {
    if (board[coordToIndex({ col: redGeneral.col, row })]) return false
  }
  return true
}

export function isLegalMove(board: Board, move: Move, color: Color): boolean {
  const next = applyMove(board, move)
  if (isInCheck(next, color)) return false
  if (generalsFacing(next)) return false
  return true
}

export function legalMovesFrom(board: Board, from: Coord): Move[] {
  const piece = board[coordToIndex(from)]
  if (!piece) return []
  return pseudoLegalMoves(board, from).filter((move) => isLegalMove(board, move, piece.color))
}

export function allLegalMoves(board: Board, color: Color): Move[] {
  return allPseudoLegalMoves(board, color).filter((move) => isLegalMove(board, move, color))
}

export type GameStatus = 'playing' | 'check' | 'checkmate' | 'no-moves-loss'

export function getGameStatus(board: Board, colorToMove: Color): GameStatus {
  const inCheck = isInCheck(board, colorToMove)
  const hasMoves = allLegalMoves(board, colorToMove).length > 0
  if (!hasMoves) return inCheck ? 'checkmate' : 'no-moves-loss'
  return inCheck ? 'check' : 'playing'
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run src/engine/rules.test.ts
```
Expected: all 7 tests PASS. If the checkmate or no-moves-loss fixture doesn't produce the expected status, re-derive the board by hand (list every piece's pseudo-legal moves and check each is covered) before assuming the engine logic is wrong — these are hand-constructed positions and the most likely bug is a coordinate mistake in the FEN string, not the rules implementation validated by the other 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/engine/rules.ts src/engine/rules.test.ts
git commit -m "feat: add check, checkmate, and flying-general rule enforcement"
```

---

### Task 5: Engine — move notation (`src/engine/moveNotation.ts`)

**Files:**
- Create: `src/engine/moveNotation.ts`
- Test: `src/engine/moveNotation.test.ts`

**Interfaces:**
- Consumes: `Move` (Task 2).
- Produces: `moveToNotation(move: Move): string`.

- [ ] **Step 1: Write the failing test**

Create `src/engine/moveNotation.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { moveToNotation } from './moveNotation'

describe('moveToNotation', () => {
  it('formats a move as (col,row)->(col,row)', () => {
    const notation = moveToNotation({ from: { col: 1, row: 7 }, to: { col: 1, row: 4 } })
    expect(notation).toBe('(1,7)->(1,4)')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/engine/moveNotation.test.ts
```
Expected: FAIL — `moveNotation.ts` does not exist.

- [ ] **Step 3: Implement `src/engine/moveNotation.ts`**

```ts
import { Move } from './board'

export function moveToNotation(move: Move): string {
  return `(${move.from.col},${move.from.row})->(${move.to.col},${move.to.row})`
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/engine/moveNotation.test.ts
```
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/engine/moveNotation.ts src/engine/moveNotation.test.ts
git commit -m "feat: add coordinate move notation"
```

---

### Task 6: AI — board evaluation (`src/ai/evaluate.ts`)

**Files:**
- Create: `src/ai/evaluate.ts`
- Test: `src/ai/evaluate.test.ts`

**Interfaces:**
- Consumes: `Board`, `Color`, `PieceType`, `Coord`, `indexToCoord` (Task 2); `hasCrossedRiver` (Task 3).
- Produces: `evaluateBoard(board, colorToMaximize): number`.

- [ ] **Step 1: Write the failing tests**

Create `src/ai/evaluate.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseFen, START_POSITION_FEN } from '../engine/board'
import { evaluateBoard } from './evaluate'

describe('evaluateBoard', () => {
  it('scores the start position equally for both sides', () => {
    const board = parseFen(START_POSITION_FEN)
    expect(evaluateBoard(board, 'red')).toBe(evaluateBoard(board, 'black'))
  })

  it('scores a material advantage as positive for the side ahead', () => {
    const board = parseFen('4k4/9/9/9/9/9/9/9/9/3RK4')
    expect(evaluateBoard(board, 'red')).toBeGreaterThan(evaluateBoard(board, 'black'))
  })

  it('gives a soldier a bonus for having crossed the river', () => {
    const beforeCrossing = parseFen('4k4/9/9/9/9/9/P8/9/9/4K4')
    const afterCrossing = parseFen('4k4/9/9/9/P8/9/9/9/9/4K4')
    expect(evaluateBoard(afterCrossing, 'red')).toBeGreaterThan(evaluateBoard(beforeCrossing, 'red'))
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/ai/evaluate.test.ts
```
Expected: FAIL — `evaluate.ts` does not exist.

- [ ] **Step 3: Implement `src/ai/evaluate.ts`**

```ts
import { Board, Color, Coord, PieceType, indexToCoord } from '../engine/board'
import { hasCrossedRiver } from '../engine/pieces'

const PIECE_VALUES: Record<PieceType, number> = {
  general: 10000,
  advisor: 200,
  elephant: 200,
  horse: 450,
  chariot: 900,
  cannon: 450,
  soldier: 100,
}

function centrality(coord: Coord): number {
  return 4 - Math.abs(coord.col - 4)
}

function positionalBonus(type: PieceType, color: Color, coord: Coord): number {
  if (type === 'soldier' && hasCrossedRiver(coord, color)) return 50
  if (type === 'horse' || type === 'cannon') return centrality(coord) * 5
  return 0
}

export function evaluateBoard(board: Board, colorToMaximize: Color): number {
  let score = 0
  board.forEach((piece, index) => {
    if (!piece) return
    const coord = indexToCoord(index)
    const value = PIECE_VALUES[piece.type] + positionalBonus(piece.type, piece.color, coord)
    score += piece.color === colorToMaximize ? value : -value
  })
  return score
}
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx vitest run src/ai/evaluate.test.ts
```
Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ai/evaluate.ts src/ai/evaluate.test.ts
git commit -m "feat: add material + positional board evaluation"
```

---

### Task 7: AI — difficulty settings and minimax search (`src/ai/difficulty.ts`, `src/ai/search.ts`)

**Files:**
- Create: `src/ai/difficulty.ts`
- Create: `src/ai/search.ts`
- Test: `src/ai/search.test.ts`

**Interfaces:**
- Consumes: `Board`, `Color`, `Move`, `applyMove` (Task 2); `allLegalMoves`, `getGameStatus` (Task 4); `evaluateBoard` (Task 6).
- Produces: `Difficulty = 'easy' | 'medium' | 'hard'`, `DIFFICULTY_SETTINGS: Record<Difficulty, { maxDepth: number; timeBudgetMs: number; randomizeTopN?: number }>`, `SearchResult { move: Move; depthReached: number }`, `findBestMove(board, color, options): SearchResult`.

- [ ] **Step 1: Write the failing tests**

Create `src/ai/search.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { parseFen } from '../engine/board'
import { findBestMove } from './search'

describe('findBestMove', () => {
  it('captures a hanging chariot when it is clearly the best move available', () => {
    const board = parseFen('4k4/9/9/9/9/9/9/r8/9/R3K4')
    const result = findBestMove(board, 'red', { maxDepth: 2, timeBudgetMs: 200 })
    expect(result.move.to).toEqual({ col: 0, row: 7 })
  })

  it('only ever returns a legal move for the side to move', () => {
    const board = parseFen('3k5/9/9/9/9/9/9/9/9/4K4')
    const result = findBestMove(board, 'red', { maxDepth: 1, timeBudgetMs: 200 })
    expect(result.move.from).toEqual({ col: 4, row: 9 })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/ai/search.test.ts
```
Expected: FAIL — `search.ts` does not exist.

- [ ] **Step 3: Implement `src/ai/difficulty.ts`**

```ts
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface DifficultySettings {
  maxDepth: number
  timeBudgetMs: number
  randomizeTopN?: number
}

export const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  easy: { maxDepth: 2, timeBudgetMs: 300, randomizeTopN: 3 },
  medium: { maxDepth: 3, timeBudgetMs: 800 },
  hard: { maxDepth: 4, timeBudgetMs: 1500 },
}
```

- [ ] **Step 4: Implement `src/ai/search.ts`**

```ts
import { Board, Color, Move, applyMove } from '../engine/board'
import { allLegalMoves, getGameStatus } from '../engine/rules'
import { evaluateBoard } from './evaluate'

function opponent(color: Color): Color {
  return color === 'red' ? 'black' : 'red'
}

function minimax(
  board: Board,
  color: Color,
  rootColor: Color,
  depth: number,
  alpha: number,
  beta: number,
): number {
  const status = getGameStatus(board, color)
  if (status === 'checkmate' || status === 'no-moves-loss') {
    return color === rootColor ? -100000 - depth : 100000 + depth
  }
  if (depth === 0) {
    return evaluateBoard(board, rootColor)
  }

  const moves = allLegalMoves(board, color)
  const next = opponent(color)

  if (color === rootColor) {
    let best = -Infinity
    for (const move of moves) {
      const score = minimax(applyMove(board, move), next, rootColor, depth - 1, alpha, beta)
      best = Math.max(best, score)
      alpha = Math.max(alpha, best)
      if (alpha >= beta) break
    }
    return best
  }

  let best = Infinity
  for (const move of moves) {
    const score = minimax(applyMove(board, move), next, rootColor, depth - 1, alpha, beta)
    best = Math.min(best, score)
    beta = Math.min(beta, best)
    if (alpha >= beta) break
  }
  return best
}

export interface SearchOptions {
  maxDepth: number
  timeBudgetMs: number
  randomizeTopN?: number
}

export interface SearchResult {
  move: Move
  depthReached: number
}

export function findBestMove(board: Board, color: Color, options: SearchOptions): SearchResult {
  const moves = allLegalMoves(board, color)
  if (moves.length === 0) throw new Error('No legal moves available')

  const deadline = Date.now() + options.timeBudgetMs
  let bestMove = moves[0]
  let depthReached = 0

  for (let depth = 1; depth <= options.maxDepth; depth++) {
    const scored = moves.map((move) => ({
      move,
      score: minimax(applyMove(board, move), opponent(color), color, depth - 1, -Infinity, Infinity),
    }))
    scored.sort((a, b) => b.score - a.score)

    bestMove = scored[0].move
    depthReached = depth

    if (options.randomizeTopN && options.randomizeTopN > 1) {
      const topCandidates = scored.slice(0, Math.min(options.randomizeTopN, scored.length))
      bestMove = topCandidates[Math.floor(Math.random() * topCandidates.length)].move
    }

    if (Date.now() >= deadline) break
  }

  return { move: bestMove, depthReached }
}
```

- [ ] **Step 5: Run the tests to verify they pass**

```bash
npx vitest run src/ai/search.test.ts
```
Expected: both tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/ai/difficulty.ts src/ai/search.ts src/ai/search.test.ts
git commit -m "feat: add minimax alpha-beta search with difficulty settings"
```

---

### Task 8: AI — Web Worker + engine interface (`src/ai/worker.ts`, `src/ai/engine.ts`)

**Files:**
- Create: `src/ai/worker.ts`
- Create: `src/ai/engine.ts`

**Interfaces:**
- Consumes: `parseFen`, `Color`, `Move` (Task 2); `findBestMove` (Task 7); `Difficulty`, `DIFFICULTY_SETTINGS` (Task 7).
- Produces: `interface XiangqiEngine { requestMove(position: string, color: Color, difficulty: Difficulty): Promise<Move> }`, `class WorkerXiangqiEngine implements XiangqiEngine` with a `terminate()` method. Task 10 (`useAIMove`) consumes `WorkerXiangqiEngine`.

No automated test for this task: Web Workers require a browser-like execution environment that this project's Vitest config (`environment: 'node'`) does not provide, and the pure search logic underneath is already covered by Task 7. This task is verified manually in Task 20 (playing a full game against the AI).

- [ ] **Step 1: Implement `src/ai/worker.ts`**

```ts
import { parseFen, type Color, type Move } from '../engine/board'
import { DIFFICULTY_SETTINGS, type Difficulty } from './difficulty'
import { findBestMove } from './search'

export interface WorkerRequest {
  position: string
  color: Color
  difficulty: Difficulty
}

export interface WorkerResponse {
  from: Move['from']
  to: Move['to']
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { position, color, difficulty } = event.data
  const board = parseFen(position)
  const settings = DIFFICULTY_SETTINGS[difficulty]
  const result = findBestMove(board, color, settings)
  const response: WorkerResponse = { from: result.move.from, to: result.move.to }
  ;(self as unknown as Worker).postMessage(response)
}
```

- [ ] **Step 2: Implement `src/ai/engine.ts`**

```ts
import type { Color, Move } from '../engine/board'
import type { Difficulty } from './difficulty'
import type { WorkerRequest, WorkerResponse } from './worker'

export interface XiangqiEngine {
  requestMove(position: string, color: Color, difficulty: Difficulty): Promise<Move>
}

export class WorkerXiangqiEngine implements XiangqiEngine {
  private worker: Worker

  constructor() {
    this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  }

  requestMove(position: string, color: Color, difficulty: Difficulty): Promise<Move> {
    return new Promise((resolve, reject) => {
      const handleMessage = (event: MessageEvent<WorkerResponse>) => {
        cleanup()
        resolve({ from: event.data.from, to: event.data.to })
      }
      const handleError = (error: ErrorEvent) => {
        cleanup()
        reject(error)
      }
      const cleanup = () => {
        this.worker.removeEventListener('message', handleMessage)
        this.worker.removeEventListener('error', handleError)
      }
      this.worker.addEventListener('message', handleMessage)
      this.worker.addEventListener('error', handleError)
      const request: WorkerRequest = { position, color, difficulty }
      this.worker.postMessage(request)
    })
  }

  terminate(): void {
    this.worker.terminate()
  }
}
```

- [ ] **Step 3: Verify the project still builds and type-checks**

```bash
npm run build
```
Expected: succeeds (this exercises Vite's Worker bundling via `new URL(...)`, so a build failure here means the worker import syntax is wrong — double check the `new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })` pattern matches exactly).

- [ ] **Step 4: Commit**

```bash
git add src/ai/worker.ts src/ai/engine.ts
git commit -m "feat: run AI search inside a Web Worker behind a swappable engine interface"
```

---

### Task 9: State — game reducer (`src/state/gameReducer.ts`)

**Files:**
- Create: `src/state/gameReducer.ts`

**Interfaces:**
- Consumes: `Board`, `Color`, `Coord`, `Move`, `Piece`, `applyMove`, `coordToIndex`, `createStartBoard` (Task 2); `legalMovesFrom`, `getGameStatus` (Task 4); `moveToNotation` (Task 5); `Difficulty` (Task 7).
- Produces: `HistoryEntry { move, piece, captured, notation }`, `GameMode = 'setup' | 'vs-ai' | 'local'`, `GameStatus = 'setup' | 'playing' | 'check' | 'checkmate' | 'no-moves-loss' | 'timeout'`, `GameState { board, turn, history, mode, difficulty, clocks, status, winner, selected, legalTargets, flipped }`, `GameAction` (union below), `initialGameState: GameState`, `gameReducer(state, action): GameState`. Task 10 (`GameProvider`) and all `src/components/` consume `GameState`/`GameAction`/`gameReducer`/`initialGameState`.

No automated test for this task, per the approved spec (Vitest coverage targets `src/engine/` and `src/ai/`); it is exercised manually in Task 20 alongside the UI that drives it.

- [ ] **Step 1: Implement `src/state/gameReducer.ts`**

```ts
import {
  Board,
  Color,
  Coord,
  Move,
  Piece,
  applyMove,
  coordToIndex,
  createStartBoard,
} from '../engine/board'
import { getGameStatus, legalMovesFrom } from '../engine/rules'
import { moveToNotation } from '../engine/moveNotation'
import type { Difficulty } from '../ai/difficulty'

export interface HistoryEntry {
  move: Move
  piece: Piece
  captured: Piece | null
  notation: string
}

export type GameMode = 'setup' | 'vs-ai' | 'local'
export type GameStatus = 'setup' | 'playing' | 'check' | 'checkmate' | 'no-moves-loss' | 'timeout'

export interface GameState {
  board: Board
  turn: Color
  history: HistoryEntry[]
  mode: GameMode
  difficulty: Difficulty | null
  clocks: { red: number; black: number } | null
  status: GameStatus
  winner: Color | null
  selected: Coord | null
  legalTargets: Coord[]
  flipped: boolean
}

export type GameAction =
  | { type: 'START_GAME'; mode: 'vs-ai' | 'local'; difficulty: Difficulty | null; clockMs: number | null }
  | { type: 'SELECT_SQUARE'; coord: Coord }
  | { type: 'MOVE'; move: Move }
  | { type: 'UNDO' }
  | { type: 'TICK'; deltaMs: number }
  | { type: 'NEW_GAME' }
  | { type: 'FLIP_BOARD' }

export const initialGameState: GameState = {
  board: createStartBoard(),
  turn: 'red',
  history: [],
  mode: 'setup',
  difficulty: null,
  clocks: null,
  status: 'setup',
  winner: null,
  selected: null,
  legalTargets: [],
  flipped: false,
}

function opponent(color: Color): Color {
  return color === 'red' ? 'black' : 'red'
}

function isOngoing(status: GameStatus): boolean {
  return status === 'playing' || status === 'check'
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      return {
        ...initialGameState,
        mode: action.mode,
        difficulty: action.difficulty,
        clocks: action.clockMs !== null ? { red: action.clockMs, black: action.clockMs } : null,
        status: 'playing',
      }
    }

    case 'NEW_GAME': {
      return { ...initialGameState }
    }

    case 'FLIP_BOARD': {
      return { ...state, flipped: !state.flipped }
    }

    case 'SELECT_SQUARE': {
      if (!isOngoing(state.status)) return state

      if (state.selected) {
        const isTarget = state.legalTargets.some(
          (target) => target.col === action.coord.col && target.row === action.coord.row,
        )
        if (isTarget) {
          return gameReducer(state, { type: 'MOVE', move: { from: state.selected, to: action.coord } })
        }
      }

      const piece = state.board[coordToIndex(action.coord)]
      if (piece && piece.color === state.turn) {
        const legalTargets = legalMovesFrom(state.board, action.coord).map((move) => move.to)
        return { ...state, selected: action.coord, legalTargets }
      }

      return { ...state, selected: null, legalTargets: [] }
    }

    case 'MOVE': {
      const piece = state.board[coordToIndex(action.move.from)]
      if (!piece) return state

      const captured = state.board[coordToIndex(action.move.to)]
      const board = applyMove(state.board, action.move)
      const nextTurn = opponent(state.turn)
      const status = getGameStatus(board, nextTurn)
      const entry: HistoryEntry = {
        move: action.move,
        piece,
        captured,
        notation: moveToNotation(action.move),
      }

      return {
        ...state,
        board,
        turn: nextTurn,
        history: [...state.history, entry],
        status,
        winner: status === 'checkmate' || status === 'no-moves-loss' ? state.turn : null,
        selected: null,
        legalTargets: [],
      }
    }

    case 'UNDO': {
      if (state.history.length === 0) return state
      const pliesToUndo = state.mode === 'vs-ai' ? 2 : 1
      const keep = Math.max(0, state.history.length - pliesToUndo)

      let board = createStartBoard()
      for (let i = 0; i < keep; i++) {
        board = applyMove(board, state.history[i].move)
      }
      const turn: Color = keep % 2 === 0 ? 'red' : 'black'
      const status = getGameStatus(board, turn)

      return {
        ...state,
        board,
        turn,
        history: state.history.slice(0, keep),
        status,
        winner: null,
        selected: null,
        legalTargets: [],
      }
    }

    case 'TICK': {
      if (!state.clocks || !isOngoing(state.status)) return state
      const remaining = Math.max(0, state.clocks[state.turn] - action.deltaMs)
      const clocks = { ...state.clocks, [state.turn]: remaining }
      if (remaining === 0) {
        return { ...state, clocks, status: 'timeout', winner: opponent(state.turn) }
      }
      return { ...state, clocks }
    }

    default:
      return state
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc -b --noEmit
```
Expected: no type errors referencing `gameReducer.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/state/gameReducer.ts
git commit -m "feat: add game state reducer (moves, undo, clocks, status)"
```

---

### Task 10: State — GameProvider + AI move hook (`src/state/GameProvider.tsx`, `src/hooks/useAIMove.ts`)

**Files:**
- Create: `src/hooks/useAIMove.ts`
- Create: `src/state/GameProvider.tsx`

**Interfaces:**
- Consumes: `GameState`, `GameAction`, `gameReducer`, `initialGameState` (Task 9); `boardToFen` (Task 2); `WorkerXiangqiEngine` (Task 8).
- Produces: `useAIMove(state, dispatch, aiColor)` (side-effect hook, no return value); `GameProvider({ children })` component; `useGame(): { state: GameState; dispatch: Dispatch<GameAction> }`. All `src/components/` consume `useGame`.

- [ ] **Step 1: Implement `src/hooks/useAIMove.ts`**

```ts
import { useEffect, useRef, type Dispatch } from 'react'
import { boardToFen, type Color } from '../engine/board'
import { WorkerXiangqiEngine } from '../ai/engine'
import type { GameAction, GameState } from '../state/gameReducer'

export function useAIMove(state: GameState, dispatch: Dispatch<GameAction>, aiColor: Color) {
  const engineRef = useRef<WorkerXiangqiEngine | null>(null)

  useEffect(() => {
    engineRef.current = new WorkerXiangqiEngine()
    return () => engineRef.current?.terminate()
  }, [])

  useEffect(() => {
    if (state.mode !== 'vs-ai') return
    if (state.turn !== aiColor) return
    if (state.status !== 'playing' && state.status !== 'check') return
    if (!state.difficulty) return

    const engine = engineRef.current
    if (!engine) return

    let cancelled = false
    engine.requestMove(boardToFen(state.board), state.turn, state.difficulty).then((move) => {
      if (!cancelled) dispatch({ type: 'MOVE', move })
    })

    return () => {
      cancelled = true
    }
  }, [state.mode, state.turn, state.status, state.difficulty, state.board, aiColor, dispatch])
}
```

- [ ] **Step 2: Implement `src/state/GameProvider.tsx`**

```tsx
import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react'
import { gameReducer, initialGameState, type GameAction, type GameState } from './gameReducer'
import { useAIMove } from '../hooks/useAIMove'

interface GameContextValue {
  state: GameState
  dispatch: Dispatch<GameAction>
}

const GameContext = createContext<GameContextValue | null>(null)

const AI_COLOR = 'black' as const
const CLOCK_TICK_MS = 250

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState)

  useAIMove(state, dispatch, AI_COLOR)

  useEffect(() => {
    if (!state.clocks) return
    if (state.status !== 'playing' && state.status !== 'check') return

    const interval = setInterval(() => {
      dispatch({ type: 'TICK', deltaMs: CLOCK_TICK_MS })
    }, CLOCK_TICK_MS)

    return () => clearInterval(interval)
  }, [state.clocks, state.status, state.turn])

  return <GameContext.Provider value={{ state, dispatch }}>{children}</GameContext.Provider>
}

export function useGame(): GameContextValue {
  const context = useContext(GameContext)
  if (!context) throw new Error('useGame must be used within a GameProvider')
  return context
}
```

- [ ] **Step 3: Verify it compiles**

```bash
npx tsc -b --noEmit
```
Expected: no type errors (some may remain if `src/App.tsx` still references old imports — that's fixed in Task 18).

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useAIMove.ts src/state/GameProvider.tsx
git commit -m "feat: wire game state to a Context provider with AI-turn and clock effects"
```

---

### Task 11: Sound — Web Audio effects (`src/sound/sound.ts`)

**Files:**
- Create: `src/sound/sound.ts`

**Interfaces:**
- Produces: `playSound(effect: 'move' | 'capture' | 'check' | 'gameEnd'): void`. Consumed by Task 12 (`Board.tsx`) and Task 16 (`StatusBanner.tsx`).

- [ ] **Step 1: Implement `src/sound/sound.ts`**

```ts
export type SoundEffect = 'move' | 'capture' | 'check' | 'gameEnd'

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) audioContext = new AudioContext()
  return audioContext
}

function playTone(frequency: number, durationMs: number, type: OscillatorType = 'sine'): void {
  const ctx = getAudioContext()
  const oscillator = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillator.type = type
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.2, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationMs / 1000)
  oscillator.connect(gain)
  gain.connect(ctx.destination)
  oscillator.start()
  oscillator.stop(ctx.currentTime + durationMs / 1000)
}

export function playSound(effect: SoundEffect): void {
  switch (effect) {
    case 'move':
      playTone(440, 80)
      return
    case 'capture':
      playTone(220, 120, 'square')
      return
    case 'check':
      playTone(660, 150, 'triangle')
      playTone(880, 150, 'triangle')
      return
    case 'gameEnd':
      playTone(330, 300, 'sawtooth')
      return
  }
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc -b --noEmit
```
Expected: no new type errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/sound/sound.ts
git commit -m "feat: add Web Audio synthesized move/capture/check/game-end sounds"
```

---

### Task 12: UI — Board rendering (`src/components/Piece.tsx`, `Square.tsx`, `Board.tsx`)

**Files:**
- Create: `src/components/Piece.tsx`
- Create: `src/components/Square.tsx`
- Create: `src/components/Board.tsx`

**Interfaces:**
- Consumes: `useGame` (Task 10); `coordToIndex`, `Coord`, `Piece as PieceModel` (Task 2); `playSound` (Task 11).
- Produces: `<Piece>`, `<Square>`, `<Board>` components. `<Board>` is consumed directly by `App.tsx` in Task 18.

- [ ] **Step 1: Implement `src/components/Piece.tsx`**

```tsx
import type { Piece as PieceModel } from '../engine/board'

const LABELS: Record<PieceModel['type'], { red: string; black: string }> = {
  general: { red: '帥', black: '將' },
  advisor: { red: '仕', black: '士' },
  elephant: { red: '相', black: '象' },
  horse: { red: '傌', black: '馬' },
  chariot: { red: '俥', black: '車' },
  cannon: { red: '炮', black: '砲' },
  soldier: { red: '兵', black: '卒' },
}

interface PieceProps {
  piece: PieceModel
  x: number
  y: number
  selected: boolean
  onClick: () => void
}

export function Piece({ piece, x, y, selected, onClick }: PieceProps) {
  const label = LABELS[piece.type][piece.color]
  const strokeClass = piece.color === 'red' ? 'stroke-red-700' : 'stroke-neutral-900'
  const fillClass = piece.color === 'red' ? 'fill-red-700' : 'fill-neutral-900'

  return (
    <g onClick={onClick} className="cursor-pointer">
      <circle
        cx={x}
        cy={y}
        r={22}
        strokeWidth={2}
        className={`fill-amber-50 ${selected ? 'stroke-emerald-500' : strokeClass}`}
      />
      <text x={x} y={y + 7} textAnchor="middle" className={`text-xl font-bold select-none ${fillClass}`}>
        {label}
      </text>
    </g>
  )
}
```

- [ ] **Step 2: Implement `src/components/Square.tsx`**

```tsx
interface SquareProps {
  x: number
  y: number
  size: number
  onClick: () => void
}

export function Square({ x, y, size, onClick }: SquareProps) {
  return (
    <rect
      x={x - size / 2}
      y={y - size / 2}
      width={size}
      height={size}
      fill="transparent"
      onClick={onClick}
    />
  )
}
```

- [ ] **Step 3: Implement `src/components/Board.tsx`**

```tsx
import { useGame } from '../state/GameProvider'
import { Piece } from './Piece'
import { Square } from './Square'
import { coordToIndex, type Coord } from '../engine/board'
import { playSound } from '../sound/sound'

const CELL = 60
const MARGIN = 40
const COLS = 9
const ROWS = 10

function boardX(col: number, flipped: boolean): number {
  return MARGIN + (flipped ? COLS - 1 - col : col) * CELL
}

function boardY(row: number, flipped: boolean): number {
  return MARGIN + (flipped ? ROWS - 1 - row : row) * CELL
}

export function Board() {
  const { state, dispatch } = useGame()
  const { board, selected, legalTargets, flipped, history } = state

  const width = MARGIN * 2 + (COLS - 1) * CELL
  const height = MARGIN * 2 + (ROWS - 1) * CELL
  const lastMove = history[history.length - 1]?.move

  function handleSquareClick(coord: Coord) {
    const isMove =
      selected !== null && legalTargets.some((t) => t.col === coord.col && t.row === coord.row)
    if (isMove) {
      const captured = board[coordToIndex(coord)]
      playSound(captured ? 'capture' : 'move')
    }
    dispatch({ type: 'SELECT_SQUARE', coord })
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="max-w-full h-auto bg-amber-100 rounded-lg shadow-md"
      role="img"
      aria-label="Xiangqi board"
    >
      {Array.from({ length: ROWS }, (_, row) => (
        <line
          key={`h-${row}`}
          x1={boardX(0, flipped)}
          y1={boardY(row, flipped)}
          x2={boardX(COLS - 1, flipped)}
          y2={boardY(row, flipped)}
          stroke="#78350f"
          strokeWidth={1}
        />
      ))}

      {Array.from({ length: COLS }, (_, col) => (
        <g key={`v-${col}`}>
          <line
            x1={boardX(col, flipped)}
            y1={boardY(0, flipped)}
            x2={boardX(col, flipped)}
            y2={boardY(4, flipped)}
            stroke="#78350f"
            strokeWidth={1}
          />
          <line
            x1={boardX(col, flipped)}
            y1={boardY(5, flipped)}
            x2={boardX(col, flipped)}
            y2={boardY(9, flipped)}
            stroke="#78350f"
            strokeWidth={1}
          />
        </g>
      ))}

      <line x1={boardX(3, flipped)} y1={boardY(0, flipped)} x2={boardX(5, flipped)} y2={boardY(2, flipped)} stroke="#78350f" />
      <line x1={boardX(5, flipped)} y1={boardY(0, flipped)} x2={boardX(3, flipped)} y2={boardY(2, flipped)} stroke="#78350f" />
      <line x1={boardX(3, flipped)} y1={boardY(7, flipped)} x2={boardX(5, flipped)} y2={boardY(9, flipped)} stroke="#78350f" />
      <line x1={boardX(5, flipped)} y1={boardY(7, flipped)} x2={boardX(3, flipped)} y2={boardY(9, flipped)} stroke="#78350f" />

      <text
        x={width / 2}
        y={(boardY(4, flipped) + boardY(5, flipped)) / 2 + 6}
        textAnchor="middle"
        className="fill-amber-800 text-lg tracking-[1em]"
      >
        楚河　　汉界
      </text>

      {board.map((piece, index) => {
        if (piece) return null
        const col = index % COLS
        const row = Math.floor(index / COLS)
        return (
          <Square
            key={`empty-${index}`}
            x={boardX(col, flipped)}
            y={boardY(row, flipped)}
            size={CELL}
            onClick={() => handleSquareClick({ col, row })}
          />
        )
      })}

      {legalTargets.map((target) => (
        <circle
          key={`target-${target.col}-${target.row}`}
          cx={boardX(target.col, flipped)}
          cy={boardY(target.row, flipped)}
          r={8}
          className="fill-emerald-500/70 cursor-pointer"
          onClick={() => handleSquareClick(target)}
        />
      ))}

      {lastMove && (
        <>
          <circle cx={boardX(lastMove.from.col, flipped)} cy={boardY(lastMove.from.row, flipped)} r={4} className="fill-sky-500" />
          <circle cx={boardX(lastMove.to.col, flipped)} cy={boardY(lastMove.to.row, flipped)} r={4} className="fill-sky-500" />
        </>
      )}

      {board.map((piece, index) => {
        if (!piece) return null
        const col = index % COLS
        const row = Math.floor(index / COLS)
        return (
          <Piece
            key={index}
            piece={piece}
            x={boardX(col, flipped)}
            y={boardY(row, flipped)}
            selected={selected?.col === col && selected?.row === row}
            onClick={() => handleSquareClick({ col, row })}
          />
        )
      })}
    </svg>
  )
}
```

- [ ] **Step 4: Verify it compiles**

```bash
npx tsc -b --noEmit
```
Expected: no new type errors from these files.

- [ ] **Step 5: Commit**

```bash
git add src/components/Piece.tsx src/components/Square.tsx src/components/Board.tsx
git commit -m "feat: render the 9x10 board as SVG with click-to-move interaction"
```

---

### Task 13: UI — Clock (`src/components/Clock.tsx`)

**Files:**
- Create: `src/components/Clock.tsx`

**Interfaces:**
- Consumes: `useGame` (Task 10); `Color` (Task 2).
- Produces: `<Clock>`, consumed by `App.tsx` (Task 18).

- [ ] **Step 1: Implement `src/components/Clock.tsx`**

```tsx
import { useGame } from '../state/GameProvider'
import type { Color } from '../engine/board'

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function ClockFace({ color, ms, active }: { color: Color; ms: number; active: boolean }) {
  return (
    <div
      className={`px-4 py-2 rounded-md font-mono text-lg ${
        active ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-neutral-700'
      }`}
    >
      {color === 'red' ? 'Red' : 'Black'}: {formatTime(ms)}
    </div>
  )
}

export function Clock() {
  const { state } = useGame()
  if (!state.clocks) return null

  return (
    <div className="flex gap-3">
      <ClockFace color="red" ms={state.clocks.red} active={state.turn === 'red'} />
      <ClockFace color="black" ms={state.clocks.black} active={state.turn === 'black'} />
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc -b --noEmit
```
Expected: no new type errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/Clock.tsx
git commit -m "feat: add per-side countdown clock display"
```

---

### Task 14: UI — Move history (`src/components/MoveHistory.tsx`)

**Files:**
- Create: `src/components/MoveHistory.tsx`

**Interfaces:**
- Consumes: `useGame` (Task 10).
- Produces: `<MoveHistory>`, consumed by `App.tsx` (Task 18).

- [ ] **Step 1: Implement `src/components/MoveHistory.tsx`**

```tsx
import { useGame } from '../state/GameProvider'

export function MoveHistory() {
  const { state } = useGame()

  return (
    <div className="border rounded-md p-3 max-h-80 overflow-y-auto bg-white">
      <h2 className="font-semibold mb-2">Move History</h2>
      <ol className="space-y-1 text-sm font-mono">
        {state.history.map((entry, index) => (
          <li key={index}>
            {index % 2 === 0 ? `${index / 2 + 1}. ` : '    '}
            {entry.piece.color === 'red' ? 'R' : 'B'} {entry.notation}
            {entry.captured ? ' x' : ''}
          </li>
        ))}
      </ol>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc -b --noEmit
```
Expected: no new type errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/MoveHistory.tsx
git commit -m "feat: add move history panel with coordinate notation"
```

---

### Task 15: UI — Controls (`src/components/Controls.tsx`)

**Files:**
- Create: `src/components/Controls.tsx`

**Interfaces:**
- Consumes: `useGame` (Task 10).
- Produces: `<Controls>`, consumed by `App.tsx` (Task 18).

- [ ] **Step 1: Implement `src/components/Controls.tsx`**

```tsx
import { useGame } from '../state/GameProvider'

export function Controls() {
  const { dispatch } = useGame()

  return (
    <div className="flex gap-2">
      <button className="px-3 py-2 rounded-md bg-neutral-800 text-white" onClick={() => dispatch({ type: 'UNDO' })}>
        Undo
      </button>
      <button className="px-3 py-2 rounded-md bg-neutral-800 text-white" onClick={() => dispatch({ type: 'FLIP_BOARD' })}>
        Flip Board
      </button>
      <button className="px-3 py-2 rounded-md bg-red-700 text-white" onClick={() => dispatch({ type: 'NEW_GAME' })}>
        New Game
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc -b --noEmit
```
Expected: no new type errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/Controls.tsx
git commit -m "feat: add undo, flip board, and new game controls"
```

---

### Task 16: UI — Status banner (`src/components/StatusBanner.tsx`)

**Files:**
- Create: `src/components/StatusBanner.tsx`

**Interfaces:**
- Consumes: `useGame` (Task 10); `playSound` (Task 11).
- Produces: `<StatusBanner>`, consumed by `App.tsx` (Task 18).

- [ ] **Step 1: Implement `src/components/StatusBanner.tsx`**

```tsx
import { useEffect, useRef } from 'react'
import { useGame } from '../state/GameProvider'
import { playSound } from '../sound/sound'
import type { GameStatus } from '../state/gameReducer'

const MESSAGES: Partial<Record<GameStatus, string>> = {
  check: 'Check!',
  checkmate: 'Checkmate!',
  'no-moves-loss': 'No legal moves — game over!',
  timeout: 'Time out!',
}

export function StatusBanner() {
  const { state } = useGame()
  const previousStatus = useRef(state.status)

  useEffect(() => {
    if (previousStatus.current === state.status) return
    previousStatus.current = state.status

    if (state.status === 'check') playSound('check')
    if (state.status === 'checkmate' || state.status === 'no-moves-loss' || state.status === 'timeout') {
      playSound('gameEnd')
    }
  }, [state.status])

  const message = MESSAGES[state.status]
  if (!message) return null

  const winnerText = state.winner ? ` ${state.winner === 'red' ? 'Red' : 'Black'} wins.` : ''

  return (
    <div className="px-4 py-2 rounded-md bg-amber-200 text-amber-900 font-semibold text-center">
      {message}
      {winnerText}
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc -b --noEmit
```
Expected: no new type errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/StatusBanner.tsx
git commit -m "feat: add check/checkmate/timeout status banner with sound"
```

---

### Task 17: UI — Game setup screen (`src/components/GameSetup.tsx`)

**Files:**
- Create: `src/components/GameSetup.tsx`

**Interfaces:**
- Consumes: `useGame` (Task 10); `Difficulty` (Task 7).
- Produces: `<GameSetup>`, consumed by `App.tsx` (Task 18).

- [ ] **Step 1: Implement `src/components/GameSetup.tsx`**

```tsx
import { useState } from 'react'
import { useGame } from '../state/GameProvider'
import type { Difficulty } from '../ai/difficulty'

const TIME_PRESETS: { label: string; ms: number | null }[] = [
  { label: '5 min', ms: 5 * 60 * 1000 },
  { label: '10 min', ms: 10 * 60 * 1000 },
  { label: '20 min', ms: 20 * 60 * 1000 },
  { label: 'No limit', ms: null },
]

export function GameSetup() {
  const { dispatch } = useGame()
  const [mode, setMode] = useState<'vs-ai' | 'local'>('vs-ai')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [clockMs, setClockMs] = useState<number | null>(10 * 60 * 1000)

  function startGame() {
    dispatch({ type: 'START_GAME', mode, difficulty: mode === 'vs-ai' ? difficulty : null, clockMs })
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md space-y-4">
      <h1 className="text-2xl font-bold text-center">Xiangqi</h1>

      <div>
        <p className="font-semibold mb-1">Mode</p>
        <div className="flex gap-2">
          <button
            className={`px-3 py-2 rounded-md flex-1 ${mode === 'vs-ai' ? 'bg-red-700 text-white' : 'bg-neutral-200'}`}
            onClick={() => setMode('vs-ai')}
          >
            vs AI
          </button>
          <button
            className={`px-3 py-2 rounded-md flex-1 ${mode === 'local' ? 'bg-red-700 text-white' : 'bg-neutral-200'}`}
            onClick={() => setMode('local')}
          >
            Local Pass & Play
          </button>
        </div>
      </div>

      {mode === 'vs-ai' && (
        <div>
          <p className="font-semibold mb-1">Difficulty</p>
          <div className="flex gap-2">
            {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
              <button
                key={level}
                className={`px-3 py-2 rounded-md flex-1 capitalize ${difficulty === level ? 'bg-red-700 text-white' : 'bg-neutral-200'}`}
                onClick={() => setDifficulty(level)}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="font-semibold mb-1">Time Control</p>
        <div className="flex gap-2 flex-wrap">
          {TIME_PRESETS.map((preset) => (
            <button
              key={preset.label}
              className={`px-3 py-2 rounded-md ${clockMs === preset.ms ? 'bg-red-700 text-white' : 'bg-neutral-200'}`}
              onClick={() => setClockMs(preset.ms)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <button className="w-full px-3 py-3 rounded-md bg-emerald-600 text-white font-semibold" onClick={startGame}>
        Start Game
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc -b --noEmit
```
Expected: no new type errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/GameSetup.tsx
git commit -m "feat: add pre-game setup screen for mode, difficulty, and time control"
```

---

### Task 18: Wire everything together in `src/App.tsx`

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `GameProvider`, `useGame` (Task 10); `GameSetup` (Task 17); `Board` (Task 12); `Clock` (Task 13); `MoveHistory` (Task 14); `Controls` (Task 15); `StatusBanner` (Task 16).

- [ ] **Step 1: Replace `src/App.tsx` entirely**

```tsx
import { GameProvider, useGame } from './state/GameProvider'
import { GameSetup } from './components/GameSetup'
import { Board } from './components/Board'
import { Clock } from './components/Clock'
import { MoveHistory } from './components/MoveHistory'
import { Controls } from './components/Controls'
import { StatusBanner } from './components/StatusBanner'

function GameScreen() {
  const { state } = useGame()

  if (state.mode === 'setup') {
    return <GameSetup />
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      <StatusBanner />
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 flex flex-col items-center gap-4">
          <Clock />
          <Board />
          <Controls />
        </div>
        <div className="lg:w-72">
          <MoveHistory />
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <GameProvider>
      <div className="min-h-screen bg-neutral-100">
        <GameScreen />
      </div>
    </GameProvider>
  )
}

export default App
```

- [ ] **Step 2: Delete any now-unused template files, if not already removed in Task 1**

```bash
rm -f src/App.css src/assets/react.svg src/assets/vite.svg src/assets/hero.png
```

- [ ] **Step 3: Run the full test suite and type check**

```bash
npm run test && npx tsc -b --noEmit
```
Expected: all engine/AI tests PASS, no type errors.

- [ ] **Step 4: Start the dev server and confirm the setup screen renders**

```bash
npm run dev
```
Expected: dev server starts; visiting the printed local URL shows the "Xiangqi" setup screen (mode/difficulty/time-control buttons, Start Game button). Stop the server with Ctrl+C once confirmed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: wire game setup, board, clock, controls, and move history into App"
```

---

### Task 19: Deployment — GitHub Pages workflow and README

**Files:**
- Create: `.github/workflows/deploy.yml`
- Modify: `README.md`

**Interfaces:** none (deployment configuration only).

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Replace `README.md` with project-specific docs**

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml README.md
git commit -m "docs: add GitHub Pages deployment workflow and README"
```

---

### Task 20: Manual end-to-end verification

**Files:** none — this task only runs the app and checks behavior.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Play vs AI (Easy)**

In the browser: start a game in "vs AI" mode, Easy difficulty, "5 min" time control. Make a legal move as Red; confirm the AI (Black) replies within a couple of seconds, a move sound plays, and the move appears in the history panel.

- [ ] **Step 3: Play vs AI (Medium and Hard)**

Start a new game at Medium, then Hard. Confirm the AI still replies (Hard may take up to ~1.5s) and never makes an illegal move (no move that violates palace/river/leg/screen rules).

- [ ] **Step 4: Undo in vs-AI mode**

Mid-game, click Undo. Confirm both the AI's last reply and your prior move are reverted in one click, and it becomes your turn again.

- [ ] **Step 5: Local Pass & Play**

Start a new game in "Local Pass & Play" mode with "No limit". Confirm both Red and Black moves are made from the same board without an AI reply, and Undo reverts exactly one ply.

- [ ] **Step 6: Flying General rule**

Manually try to maneuver a piece such that moving it would expose the two generals on an open file (e.g., move every piece off the shared central file if both generals end up file-aligned). Confirm the UI simply does not offer that square as a legal-move highlight.

- [ ] **Step 7: Check and checkmate alerts**

Play toward putting a general in check. Confirm the status banner shows "Check!" with a sound, and if you can force a checkmate (or reach one via the AI), confirm "Checkmate!" displays with the winner and a game-end sound, and no further moves can be made.

- [ ] **Step 8: Timeout**

Start a game with a short custom scenario: temporarily you can verify the countdown visually ticks down every second for the side to move; you do not need to wait out a full 5-minute clock — confirm the active side's clock is the one counting down and switches sides after each move.

- [ ] **Step 9: Flip board**

Click "Flip Board" and confirm the board visually rotates 180° (Black's pieces now at the bottom) without changing whose turn it is or any game state.

- [ ] **Step 10: Production build**

```bash
npm run build && npm run preview
```
Open the printed preview URL and repeat a quick smoke test (start a game, make a move) to confirm the production build behaves the same as dev.

- [ ] **Step 11: Final full-suite check and commit**

```bash
npm run test && npx tsc -b --noEmit
```
Expected: all tests PASS, no type errors. If everything in Steps 2-10 worked, no code changes are expected here — this step is a final confidence check before considering the plan complete. If any manual check surfaced a bug, fix it, add/adjust a test if the fix lives in `src/engine/` or `src/ai/`, and commit the fix with a message describing what was wrong.
