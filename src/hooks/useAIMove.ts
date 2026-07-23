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
