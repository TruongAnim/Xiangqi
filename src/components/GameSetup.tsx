import { useState } from 'react'
import { useGame } from '../state/gameContext'
import { useLanguage } from '../i18n/languageContext'
import { LanguageToggle } from './LanguageToggle'
import { loadGame } from '../state/persistence'
import type { Difficulty } from '../ai/difficulty'

const TIME_PRESETS: (number | null)[] = [5 * 60 * 1000, 10 * 60 * 1000, 20 * 60 * 1000, null]
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']

function Choice({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        selected ? 'bg-red-700 text-white shadow-sm' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
      }`}
    >
      {children}
    </button>
  )
}

export function GameSetup() {
  const { dispatch } = useGame()
  const { t } = useLanguage()

  const [mode, setMode] = useState<'vs-ai' | 'local'>('vs-ai')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [clockMs, setClockMs] = useState<number | null>(10 * 60 * 1000)
  // Read once on mount: a saved game only exists before this screen starts a new one.
  const [savedGame] = useState(() => loadGame())

  const difficultyLabel: Record<Difficulty, string> = {
    easy: t.difficultyEasy,
    medium: t.difficultyMedium,
    hard: t.difficultyHard,
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-5 rounded-xl bg-white p-6 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{t.appTitle}</h1>
          <p className="text-sm text-neutral-500">{t.appSubtitle}</p>
        </div>
        <LanguageToggle />
      </div>

      {savedGame && (
        <button
          className="w-full rounded-lg border border-emerald-600 px-3 py-2.5 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
          onClick={() => dispatch({ type: 'RESTORE', state: savedGame })}
        >
          {t.resumeGame}
        </button>
      )}

      <div>
        <p className="mb-1.5 text-sm font-semibold text-neutral-700">{t.mode}</p>
        <div className="flex gap-2">
          <Choice selected={mode === 'vs-ai'} onClick={() => setMode('vs-ai')}>
            {t.modeVsAi}
          </Choice>
          <Choice selected={mode === 'local'} onClick={() => setMode('local')}>
            {t.modeLocal}
          </Choice>
        </div>
      </div>

      {mode === 'vs-ai' && (
        <div>
          <p className="mb-1.5 text-sm font-semibold text-neutral-700">{t.difficulty}</p>
          <div className="flex gap-2">
            {DIFFICULTIES.map((level) => (
              <Choice key={level} selected={difficulty === level} onClick={() => setDifficulty(level)}>
                {difficultyLabel[level]}
              </Choice>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-1.5 text-sm font-semibold text-neutral-700">{t.timeControl}</p>
        <div className="flex flex-wrap gap-2">
          {TIME_PRESETS.map((preset) => (
            <Choice key={String(preset)} selected={clockMs === preset} onClick={() => setClockMs(preset)}>
              {preset === null ? t.timeNoLimit : t.timeMinutes(preset / 60000)}
            </Choice>
          ))}
        </div>
      </div>

      <button
        className="w-full rounded-lg bg-emerald-600 px-3 py-3 font-semibold text-white transition-colors hover:bg-emerald-700"
        onClick={() =>
          dispatch({
            type: 'START_GAME',
            mode,
            difficulty: mode === 'vs-ai' ? difficulty : null,
            clockMs,
          })
        }
      >
        {t.startGame}
      </button>
    </div>
  )
}
