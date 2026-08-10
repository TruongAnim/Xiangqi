import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { LanguageContext, messagesFor, readStoredLanguage, storeLanguage } from './languageContext'
import type { Language } from './messages'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => readStoredLanguage())

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next)
    storeLanguage(next)
    document.documentElement.lang = next
  }, [])

  const value = useMemo(
    () => ({ language, setLanguage, t: messagesFor(language) }),
    [language, setLanguage],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
