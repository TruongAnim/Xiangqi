import { useLanguage } from '../i18n/languageContext'
import { LANGUAGES } from '../i18n/messages'

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage()

  return (
    <div className="inline-flex rounded-lg border border-neutral-300 bg-white p-0.5" role="group" aria-label={t.language}>
      {LANGUAGES.map((code) => (
        <button
          key={code}
          onClick={() => setLanguage(code)}
          aria-pressed={language === code}
          className={`rounded-md px-2.5 py-1 text-xs font-medium uppercase transition-colors ${
            language === code ? 'bg-neutral-800 text-white' : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  )
}
