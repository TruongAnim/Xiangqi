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
