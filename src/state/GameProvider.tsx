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
