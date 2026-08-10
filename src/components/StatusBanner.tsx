import { useEffect, useRef } from 'react'
import { useGame } from '../state/gameContext'
import { useLanguage } from '../i18n/languageContext'
import { isGameOver } from '../state/gameReducer'
import { playSound } from '../sound/sound'

export function StatusBanner() {
  const { state } = useGame()
  const { t } = useLanguage()
  const previousStatus = useRef(state.status)

  useEffect(() => {
    if (previousStatus.current === state.status) return
    previousStatus.current = state.status

    if (state.status === 'check') playSound('check')
    else if (isGameOver(state.status)) playSound('gameEnd')
  }, [state.status])

  const message = (() => {
    switch (state.status) {
      case 'check':
        return t.check
      case 'checkmate':
        return t.checkmate
      case 'no-moves-loss':
        return t.noMoves
      case 'timeout':
        return t.timeout
      case 'perpetual-check-loss':
        return t.perpetualCheck
      case 'draw':
        return state.drawReason === 'no-capture' ? t.drawNoCapture : t.drawRepetition
      default:
        return null
    }
  })()

  if (!message) return null

  const winnerText = state.winner ? ` ${t.winner(state.winner === 'red' ? t.red : t.black)}` : ''
  const tone = isGameOver(state.status)
    ? 'bg-neutral-900 text-white'
    : 'bg-amber-200 text-amber-900'

  return (
    <div className={`rounded-lg px-4 py-2 text-center font-semibold ${tone}`} role="status">
      {message}
      {winnerText}
    </div>
  )
}
