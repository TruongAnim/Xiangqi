import { BOARD_COLS, BOARD_ROWS } from '../engine/board'
import { initialGameState, type GameState } from './gameReducer'

/** Bump when the shape of the saved game changes; old saves are then ignored. */
const STORAGE_KEY = 'xiangqi:saved-game:v1'

interface SavedGame {
  version: 1
  state: GameState
}

/**
 * localStorage throws rather than returning null when a browser blocks storage
 * (Safari private browsing, cookies disabled), so every access is guarded and a
 * failure just means the game is not saved.
 */
function defaultStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

function isCoord(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const coord = value as Record<string, unknown>
  return typeof coord.col === 'number' && typeof coord.row === 'number'
}

/**
 * A save can be stale, hand-edited or written by an older build, and feeding a
 * malformed board to the rules engine would crash the app on load. Anything
 * that does not look like a game is discarded.
 */
function isGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false
  const state = value as Partial<GameState>

  if (!Array.isArray(state.board) || state.board.length !== BOARD_COLS * BOARD_ROWS) return false
  if (state.turn !== 'red' && state.turn !== 'black') return false
  if (state.mode !== 'vs-ai' && state.mode !== 'local') return false
  if (typeof state.status !== 'string' || !(state.status in STATUSES)) return false
  if (!Array.isArray(state.history)) return false
  if (typeof state.positionCounts !== 'object' || state.positionCounts === null) return false
  if (typeof state.pliesSinceCapture !== 'number') return false

  return state.history.every((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) return false
    const record = entry as Record<string, unknown>
    const move = record.move as Record<string, unknown> | undefined
    return (
      typeof move === 'object' &&
      move !== null &&
      isCoord(move.from) &&
      isCoord(move.to) &&
      typeof record.piece === 'object' &&
      record.piece !== null
    )
  })
}

const STATUSES: Record<GameState['status'], true> = {
  setup: true,
  playing: true,
  check: true,
  checkmate: true,
  'no-moves-loss': true,
  timeout: true,
  draw: true,
  'perpetual-check-loss': true,
}

export function saveGame(state: GameState, storage: Storage | null = defaultStorage()): void {
  if (!storage) return
  const payload: SavedGame = { version: 1, state: { ...state, thinking: false } }
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    // Quota exceeded or storage disabled mid-session; the game just is not saved.
  }
}

export function loadGame(storage: Storage | null = defaultStorage()): GameState | null {
  if (!storage) return null

  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<SavedGame>
    if (parsed?.version !== 1 || !isGameState(parsed.state)) {
      clearGame(storage)
      return null
    }
    // Merge over the defaults so a save written before a field existed still loads.
    return { ...initialGameState, ...parsed.state, thinking: false }
  } catch {
    clearGame(storage)
    return null
  }
}

export function clearGame(storage: Storage | null = defaultStorage()): void {
  if (!storage) return
  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to do: the save simply stays behind.
  }
}
