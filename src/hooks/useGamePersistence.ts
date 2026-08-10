import { useEffect, useState, type Dispatch } from 'react'
import { clearGame, loadGame, saveGame } from '../state/persistence'
import type { GameAction, GameState } from '../state/gameReducer'

/**
 * Keeps the game in localStorage so a refresh or a closed tab does not lose it.
 * Saving waits until the stored game has been read back, otherwise the first
 * render — which always holds the empty setup state — would wipe the save.
 */
export function useGamePersistence(state: GameState, dispatch: Dispatch<GameAction>) {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const saved = loadGame()
    if (saved) dispatch({ type: 'RESTORE', state: saved })
    setHydrated(true)
  }, [dispatch])

  useEffect(() => {
    if (!hydrated) return
    if (state.mode === 'setup') {
      clearGame()
      return
    }
    saveGame(state)
  }, [hydrated, state])
}
