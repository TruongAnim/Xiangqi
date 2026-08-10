import { useGame } from '../state/gameContext'
import { useLanguage } from '../i18n/languageContext'
import { AI_COLOR, isOngoing } from '../state/gameReducer'
import type { Color } from '../engine/board'

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

interface ClockFaceProps {
  label: string
  color: Color
  ms: number | null
  active: boolean
  hint: string | null
}

function ClockFace({ label, color, ms, active, hint }: ClockFaceProps) {
  const low = ms !== null && ms <= 30000
  const dot = color === 'red' ? 'bg-red-600' : 'bg-neutral-800'

  return (
    <div
      className={`flex-1 rounded-lg border px-3 py-2 transition-colors ${
        active ? 'border-emerald-500 bg-emerald-50' : 'border-neutral-200 bg-white'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${dot}`} />
        <span className="text-sm font-medium text-neutral-700">{label}</span>
      </div>
      {ms !== null && (
        <div className={`font-mono text-2xl tabular-nums ${low ? 'text-red-600' : 'text-neutral-900'}`}>
          {formatTime(ms)}
        </div>
      )}
      {hint && <div className="text-xs text-neutral-500">{hint}</div>}
    </div>
  )
}

export function Clock() {
  const { state } = useGame()
  const { t } = useLanguage()

  const sides: Color[] = state.flipped ? ['red', 'black'] : ['black', 'red']

  function labelFor(color: Color): string {
    const side = color === 'red' ? t.red : t.black
    if (state.mode !== 'vs-ai') return side
    return `${side} · ${color === AI_COLOR ? t.computer : t.you}`
  }

  function hintFor(color: Color): string | null {
    if (!isOngoing(state.status) || state.turn !== color) return null
    if (state.thinking) return t.thinking
    return state.mode === 'vs-ai' && color !== AI_COLOR ? t.yourTurn : t.turnOf(color === 'red' ? t.red : t.black)
  }

  return (
    <div className="flex w-full gap-2">
      {sides.map((color) => (
        <ClockFace
          key={color}
          label={labelFor(color)}
          color={color}
          ms={state.clocks ? state.clocks[color] : null}
          active={state.turn === color && isOngoing(state.status)}
          hint={hintFor(color)}
        />
      ))}
    </div>
  )
}
