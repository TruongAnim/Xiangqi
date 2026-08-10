import { useEffect, useRef } from 'react'
import { useGame } from '../state/gameContext'
import { useLanguage } from '../i18n/languageContext'

export function MoveHistory() {
  const { state } = useGame()
  const { language, t } = useLanguage()
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [state.history.length])

  // One row per full move: red's move on the left, black's reply on the right.
  const rows = Array.from({ length: Math.ceil(state.history.length / 2) }, (_, index) => ({
    number: index + 1,
    red: state.history[index * 2],
    black: state.history[index * 2 + 1],
  }))

  return (
    <div className="flex h-full flex-col rounded-lg border border-neutral-200 bg-white p-3">
      <h2 className="mb-2 text-sm font-semibold text-neutral-700">{t.moveHistory}</h2>

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-400">{t.noMovesYet}</p>
      ) : (
        <ol ref={listRef} className="max-h-64 space-y-0.5 overflow-y-auto text-sm lg:max-h-[26rem]">
          {rows.map((row) => (
            <li key={row.number} className="flex gap-2 rounded px-1 py-0.5 odd:bg-neutral-50">
              <span className="w-6 shrink-0 text-right text-neutral-400 tabular-nums">{row.number}.</span>
              <span className="flex-1 text-red-700">
                {row.red.notation[language]}
                {row.red.captured ? ' ×' : ''}
              </span>
              <span className="flex-1 text-neutral-800">
                {row.black ? `${row.black.notation[language]}${row.black.captured ? ' ×' : ''}` : ''}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
