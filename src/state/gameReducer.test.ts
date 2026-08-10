import { describe, expect, it } from 'vitest'
import { parseFen, type Move } from '../engine/board'
import { gameReducer, initialGameState, positionKey, type GameState } from './gameReducer'

function startGame(mode: 'vs-ai' | 'local' = 'local', clockMs: number | null = null): GameState {
  return gameReducer(initialGameState, {
    type: 'START_GAME',
    mode,
    difficulty: mode === 'vs-ai' ? 'easy' : null,
    clockMs,
  })
}

function play(state: GameState, ...moves: Move[]): GameState {
  return moves.reduce((current, move) => gameReducer(current, { type: 'MOVE', move }), state)
}

/** Both chariots step out and back, returning the position to where it started. */
const SHUFFLE: Move[] = [
  { from: { col: 0, row: 9 }, to: { col: 0, row: 8 } },
  { from: { col: 0, row: 0 }, to: { col: 0, row: 1 } },
  { from: { col: 0, row: 8 }, to: { col: 0, row: 9 } },
  { from: { col: 0, row: 1 }, to: { col: 0, row: 0 } },
]

describe('gameReducer', () => {
  it('starts a game with red to move and an empty history', () => {
    const state = startGame()
    expect(state.status).toBe('playing')
    expect(state.turn).toBe('red')
    expect(state.history).toHaveLength(0)
  })

  it('keeps the board orientation across a new game', () => {
    const flipped = gameReducer(startGame(), { type: 'FLIP_BOARD' })
    expect(gameReducer(flipped, { type: 'NEW_GAME' }).flipped).toBe(true)
  })

  it('records notation, capture and check flags on each move', () => {
    const state = play(startGame(), { from: { col: 7, row: 7 }, to: { col: 4, row: 7 } })
    const entry = state.history[0]

    expect(entry.notation.vi).toBe('Pháo 2 bình 5')
    expect(entry.notation.en).toBe('C2.5')
    expect(entry.captured).toBeNull()
    expect(entry.gaveCheck).toBe(false)
    expect(state.turn).toBe('black')
  })

  it('ignores clicks on the engine’s pieces in a vs-AI game', () => {
    const afterRed = play(startGame('vs-ai'), { from: { col: 7, row: 7 }, to: { col: 4, row: 7 } })
    expect(afterRed.turn).toBe('black')

    const clicked = gameReducer(afterRed, { type: 'SELECT_SQUARE', coord: { col: 0, row: 0 } })
    expect(clicked.selected).toBeNull()
    expect(clicked.legalTargets).toHaveLength(0)
  })

  it('lets either side be selected in a local game', () => {
    const afterRed = play(startGame('local'), { from: { col: 7, row: 7 }, to: { col: 4, row: 7 } })
    const clicked = gameReducer(afterRed, { type: 'SELECT_SQUARE', coord: { col: 0, row: 0 } })
    expect(clicked.selected).toEqual({ col: 0, row: 0 })
  })

  it('draws once a position has been repeated three times', () => {
    let state = startGame()
    state = play(state, ...SHUFFLE, ...SHUFFLE)

    expect(state.status).toBe('draw')
    expect(state.drawReason).toBe('repetition')
    expect(state.winner).toBeNull()
  })

  it('does not draw before the third repetition', () => {
    const state = play(startGame(), ...SHUFFLE)
    expect(state.status).toBe('playing')
  })

  it('counts plies since the last capture and resets on a capture', () => {
    let state = play(startGame(), { from: { col: 1, row: 7 }, to: { col: 1, row: 3 } })
    expect(state.pliesSinceCapture).toBe(1)

    // Black's soldier on (2,3) takes the cannon that just landed next to it.
    state = play(state, { from: { col: 2, row: 3 }, to: { col: 1, row: 3 } })
    expect(state.history[1].captured?.type).toBe('cannon')
    expect(state.pliesSinceCapture).toBe(0)
  })

  it('rewinds a single ply in a local game', () => {
    const state = play(startGame(), { from: { col: 7, row: 7 }, to: { col: 4, row: 7 } })
    const undone = gameReducer(state, { type: 'UNDO' })

    expect(undone.history).toHaveLength(0)
    expect(undone.turn).toBe('red')
    expect(undone.board).toEqual(initialGameState.board)
  })

  it('rewinds both plies in a vs-AI game so it is the human’s turn again', () => {
    const state = play(
      startGame('vs-ai'),
      { from: { col: 7, row: 7 }, to: { col: 4, row: 7 } },
      { from: { col: 1, row: 0 }, to: { col: 2, row: 2 } },
    )
    const undone = gameReducer(state, { type: 'UNDO' })

    expect(undone.history).toHaveLength(0)
    expect(undone.turn).toBe('red')
  })

  it('rewinds only the human ply when the engine has not replied yet', () => {
    const state = play(startGame('vs-ai'), { from: { col: 7, row: 7 }, to: { col: 4, row: 7 } })
    const undone = gameReducer(state, { type: 'UNDO' })

    expect(undone.history).toHaveLength(0)
    expect(undone.turn).toBe('red')
  })

  it('rebuilds repetition counts after an undo', () => {
    let state = play(startGame(), ...SHUFFLE, ...SHUFFLE.slice(0, 3))
    state = gameReducer(state, { type: 'UNDO' })

    expect(state.history).toHaveLength(6)
    expect(Object.values(state.positionCounts).some((count) => count > 3)).toBe(false)
    expect(state.status).toBe('playing')
  })

  it('gives the game to the side being perpetually checked', () => {
    // Red's chariot hops between rows 0 and 1 checking the bare black general,
    // which has nothing to do but step back and forth. Repeating that is a loss
    // for red, not a draw.
    const board = parseFen('4k4/R8/9/9/9/9/9/9/9/3K5')
    const start: GameState = {
      ...initialGameState,
      board,
      mode: 'local',
      status: 'playing',
      turn: 'red',
      positionCounts: { [positionKey(board, 'red')]: 1 },
    }

    const cycle: Move[] = [
      { from: { col: 0, row: 1 }, to: { col: 0, row: 0 } },
      { from: { col: 4, row: 0 }, to: { col: 4, row: 1 } },
      { from: { col: 0, row: 0 }, to: { col: 0, row: 1 } },
      { from: { col: 4, row: 1 }, to: { col: 4, row: 0 } },
    ]

    const midway = play(start, ...cycle)
    expect(midway.status).toBe('playing')

    const repeated = play(midway, ...cycle)
    expect(repeated.status).toBe('perpetual-check-loss')
    expect(repeated.winner).toBe('black')
    expect(repeated.drawReason).toBeNull()
  })

  it('awards the game on time and stops the clock', () => {
    let state = startGame('local', 1000)
    state = gameReducer(state, { type: 'TICK', deltaMs: 1000 })

    expect(state.status).toBe('timeout')
    expect(state.winner).toBe('black')
    expect(state.clocks?.red).toBe(0)

    const afterMore = gameReducer(state, { type: 'TICK', deltaMs: 1000 })
    expect(afterMore.clocks?.black).toBe(1000)
  })

  it('refuses moves once the game is over', () => {
    let state = startGame('local', 1000)
    state = gameReducer(state, { type: 'TICK', deltaMs: 1000 })
    const after = play(state, { from: { col: 7, row: 7 }, to: { col: 4, row: 7 } })

    expect(after.history).toHaveLength(0)
  })
})
