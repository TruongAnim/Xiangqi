import { beforeEach, describe, expect, it } from 'vitest'
import { gameReducer, initialGameState, type GameState } from './gameReducer'
import { clearGame, loadGame, saveGame } from './persistence'

function createStorage(): Storage {
  const entries = new Map<string, string>()
  return {
    get length() {
      return entries.size
    },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    removeItem: (key) => {
      entries.delete(key)
    },
    setItem: (key, value) => {
      entries.set(key, value)
    },
  }
}

/** A storage that rejects every call, like Safari with cookies blocked. */
function createBrokenStorage(): Storage {
  const fail = () => {
    throw new Error('storage disabled')
  }
  return {
    get length(): number {
      return fail()
    },
    clear: fail,
    getItem: fail,
    key: fail,
    removeItem: fail,
    setItem: fail,
  }
}

function playedGame(): GameState {
  const started = gameReducer(initialGameState, {
    type: 'START_GAME',
    mode: 'vs-ai',
    difficulty: 'medium',
    clockMs: 600000,
  })
  return gameReducer(started, { type: 'MOVE', move: { from: { col: 7, row: 7 }, to: { col: 4, row: 7 } } })
}

describe('game persistence', () => {
  let storage: Storage

  beforeEach(() => {
    storage = createStorage()
  })

  it('round-trips a game in progress', () => {
    const state = playedGame()
    saveGame(state, storage)

    const loaded = loadGame(storage)
    expect(loaded?.board).toEqual(state.board)
    expect(loaded?.turn).toBe('black')
    expect(loaded?.difficulty).toBe('medium')
    expect(loaded?.history).toHaveLength(1)
    expect(loaded?.history[0].notation.vi).toBe('Pháo 2 bình 5')
    expect(loaded?.positionCounts).toEqual(state.positionCounts)
  })

  it('never restores a game as still thinking', () => {
    saveGame({ ...playedGame(), thinking: true }, storage)
    expect(loadGame(storage)?.thinking).toBe(false)
  })

  it('returns null when nothing has been saved', () => {
    expect(loadGame(storage)).toBeNull()
  })

  it('discards and clears a save from a different version', () => {
    storage.setItem('xiangqi:saved-game:v1', JSON.stringify({ version: 0, state: playedGame() }))
    expect(loadGame(storage)).toBeNull()
    expect(storage.length).toBe(0)
  })

  it('discards a save whose board is the wrong size', () => {
    const broken = { ...playedGame(), board: [null, null] }
    storage.setItem('xiangqi:saved-game:v1', JSON.stringify({ version: 1, state: broken }))
    expect(loadGame(storage)).toBeNull()
  })

  it('discards a save whose history entries are malformed', () => {
    const broken = { ...playedGame(), history: [{ move: { from: { col: 0 } } }] }
    storage.setItem('xiangqi:saved-game:v1', JSON.stringify({ version: 1, state: broken }))
    expect(loadGame(storage)).toBeNull()
  })

  it('discards a save that is not valid JSON', () => {
    storage.setItem('xiangqi:saved-game:v1', 'not json at all')
    expect(loadGame(storage)).toBeNull()
    expect(storage.length).toBe(0)
  })

  it('fills in fields that a save written by an older build is missing', () => {
    const state = playedGame() as Partial<GameState>
    delete state.pliesSinceCapture
    storage.setItem('xiangqi:saved-game:v1', JSON.stringify({ version: 1, state }))

    // pliesSinceCapture is validated, so dropping it invalidates the save.
    expect(loadGame(storage)).toBeNull()
  })

  it('clears the saved game on request', () => {
    saveGame(playedGame(), storage)
    clearGame(storage)
    expect(loadGame(storage)).toBeNull()
  })

  it('does nothing when storage is unavailable', () => {
    expect(() => saveGame(playedGame(), null)).not.toThrow()
    expect(loadGame(null)).toBeNull()
    expect(() => clearGame(null)).not.toThrow()
  })

  it('survives a storage that throws on every call', () => {
    const broken = createBrokenStorage()
    expect(() => saveGame(playedGame(), broken)).not.toThrow()
    expect(loadGame(broken)).toBeNull()
    expect(() => clearGame(broken)).not.toThrow()
  })
})
