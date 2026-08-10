import { useGame } from '../state/gameContext'
import { useLanguage } from '../i18n/languageContext'
import { PIECE_VALUES } from '../ai/evaluate'
import type { Color, Piece } from '../engine/board'

const LABELS: Record<Piece['type'], { red: string; black: string }> = {
  general: { red: '帥', black: '將' },
  advisor: { red: '仕', black: '士' },
  elephant: { red: '相', black: '象' },
  horse: { red: '傌', black: '馬' },
  chariot: { red: '俥', black: '車' },
  cannon: { red: '炮', black: '砲' },
  soldier: { red: '兵', black: '卒' },
}

function materialOf(pieces: Piece[]): number {
  return pieces.reduce((total, piece) => total + PIECE_VALUES[piece.type], 0)
}

function Row({ label, pieces, advantage }: { label: string; pieces: Piece[]; advantage: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-10 shrink-0 text-xs text-neutral-500">{label}</span>
      <div className="flex flex-1 flex-wrap gap-0.5">
        {pieces.map((piece, index) => (
          <span
            key={index}
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full border text-sm ${
              piece.color === 'red'
                ? 'border-red-300 bg-red-50 text-red-700'
                : 'border-neutral-300 bg-neutral-100 text-neutral-800'
            }`}
          >
            {LABELS[piece.type][piece.color]}
          </span>
        ))}
      </div>
      {advantage > 0 && (
        <span className="shrink-0 text-xs font-medium text-emerald-700">+{Math.round(advantage / 100)}</span>
      )}
    </div>
  )
}

export function CapturedPieces() {
  const { state } = useGame()
  const { t } = useLanguage()

  // A piece captured by red is a black piece, so group by the victim's colour.
  const takenBy = (color: Color) =>
    state.history
      .filter((entry) => entry.captured && entry.piece.color === color)
      .map((entry) => entry.captured as Piece)

  const byRed = takenBy('red')
  const byBlack = takenBy('black')
  const balance = materialOf(byRed) - materialOf(byBlack)

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <h2 className="mb-2 text-sm font-semibold text-neutral-700">{t.captured}</h2>
      {byRed.length === 0 && byBlack.length === 0 ? (
        <p className="text-sm text-neutral-400">{t.nothingCaptured}</p>
      ) : (
        <div className="space-y-1.5">
          <Row label={t.red} pieces={byRed} advantage={balance} />
          <Row label={t.black} pieces={byBlack} advantage={-balance} />
        </div>
      )}
    </div>
  )
}
