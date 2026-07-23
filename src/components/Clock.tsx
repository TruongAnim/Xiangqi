import { useGame } from '../state/GameProvider'
import type { Color } from '../engine/board'

function formatTime(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function ClockFace({ color, ms, active }: { color: Color; ms: number; active: boolean }) {
  return (
    <div
      className={`px-4 py-2 rounded-md font-mono text-lg ${
        active ? 'bg-emerald-600 text-white' : 'bg-neutral-200 text-neutral-700'
      }`}
    >
      {color === 'red' ? 'Red' : 'Black'}: {formatTime(ms)}
    </div>
  )
}

export function Clock() {
  const { state } = useGame()
  if (!state.clocks) return null

  return (
    <div className="flex gap-3">
      <ClockFace color="red" ms={state.clocks.red} active={state.turn === 'red'} />
      <ClockFace color="black" ms={state.clocks.black} active={state.turn === 'black'} />
    </div>
  )
}
