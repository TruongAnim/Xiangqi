import { useState } from 'react'
import { useGame } from '../state/gameContext'
import { useLanguage } from '../i18n/languageContext'
import { isMuted, setMuted } from '../sound/sound'

const BUTTON =
  'rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40'

export function Controls() {
  const { state, dispatch } = useGame()
  const { t } = useLanguage()
  const [muted, setMutedState] = useState(isMuted)

  function toggleSound() {
    const next = !muted
    setMuted(next)
    setMutedState(next)
  }

  return (
    <div className="flex w-full flex-wrap justify-center gap-2">
      <button
        className={`${BUTTON} bg-neutral-800 text-white hover:bg-neutral-700`}
        onClick={() => dispatch({ type: 'UNDO' })}
        disabled={state.history.length === 0}
      >
        {t.undo}
      </button>
      <button
        className={`${BUTTON} bg-neutral-200 text-neutral-800 hover:bg-neutral-300`}
        onClick={() => dispatch({ type: 'FLIP_BOARD' })}
      >
        {t.flipBoard}
      </button>
      <button
        className={`${BUTTON} bg-neutral-200 text-neutral-800 hover:bg-neutral-300`}
        onClick={toggleSound}
      >
        {muted ? t.soundOff : t.soundOn}
      </button>
      <button
        className={`${BUTTON} bg-red-700 text-white hover:bg-red-800`}
        onClick={() => dispatch({ type: 'NEW_GAME' })}
      >
        {t.newGame}
      </button>
    </div>
  )
}
