import { useEffect, useRef, type Dispatch } from 'react'
import { boardToFen, type Color } from '../engine/board'
import { EngineCancelled, WorkerXiangqiEngine } from '../ai/engine'
import { isOngoing, type GameAction, type GameState } from '../state/gameReducer'

export function useAIMove(state: GameState, dispatch: Dispatch<GameAction>, aiColor: Color) {
  const engineRef = useRef<WorkerXiangqiEngine | null>(null)

  useEffect(() => {
    const engine = new WorkerXiangqiEngine()
    engineRef.current = engine
    return () => {
      engineRef.current = null
      engine.terminate()
    }
  }, [])

  const engineToMove =
    state.mode === 'vs-ai' && state.turn === aiColor && isOngoing(state.status) && state.difficulty !== null

  useEffect(() => {
    const engine = engineRef.current
    if (!engineToMove || !engine || !state.difficulty) return

    let active = true
    dispatch({ type: 'SET_THINKING', thinking: true })

    engine
      .requestMove(boardToFen(state.board), state.turn, state.difficulty)
      .then((result) => {
        if (!active) return
        dispatch({ type: 'SET_THINKING', thinking: false })
        dispatch({ type: 'MOVE', move: result.move })
      })
      .catch((error: unknown) => {
        if (!active || error instanceof EngineCancelled) return
        dispatch({ type: 'SET_THINKING', thinking: false })
        console.error('Engine failed to produce a move', error)
      })

    return () => {
      // A take-back or a new game while the engine is searching: drop the answer.
      active = false
      engine.cancel()
      dispatch({ type: 'SET_THINKING', thinking: false })
    }
  }, [engineToMove, state.board, state.turn, state.difficulty, dispatch])
}
