import { useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { AI_COLOR, gameReducer, initialGameState, isOngoing } from './gameReducer'
import { GameContext } from './gameContext'
import { useAIMove } from '../hooks/useAIMove'
import { useGamePersistence } from '../hooks/useGamePersistence'
import { playSound } from '../sound/sound'

const CLOCK_TICK_MS = 250

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState)

  useAIMove(state, dispatch, AI_COLOR)
  useGamePersistence(state, dispatch)

  const previousHistoryLengthRef = useRef(state.history.length)

  useEffect(() => {
    const previousLength = previousHistoryLengthRef.current
    const currentLength = state.history.length
    if (currentLength === previousLength + 1) {
      const entry = state.history[currentLength - 1]
      playSound(entry.captured ? 'capture' : 'move')
    }
    previousHistoryLengthRef.current = currentLength
  }, [state.history])

  useEffect(() => {
    if (!state.clocks) return
    if (!isOngoing(state.status)) return

    const interval = setInterval(() => {
      dispatch({ type: 'TICK', deltaMs: CLOCK_TICK_MS })
    }, CLOCK_TICK_MS)

    return () => clearInterval(interval)
  }, [state.clocks, state.status, state.turn])

  const value = useMemo(() => ({ state, dispatch }), [state])

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}
