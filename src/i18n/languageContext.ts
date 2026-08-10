import { createContext, useContext } from 'react'
import { MESSAGES, type Language, type Messages } from './messages'

export interface LanguageContextValue {
  language: Language
  setLanguage: (language: Language) => void
  t: Messages
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider')
  return context
}

const STORAGE_KEY = 'xiangqi:language'

export function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'vi' || stored === 'en') return stored
  } catch {
    // Storage blocked; fall through to the default.
  }
  // Vietnamese is the default, but honour an English-speaking browser.
  return typeof navigator !== 'undefined' && navigator.language?.startsWith('en') ? 'en' : 'vi'
}

export function storeLanguage(language: Language): void {
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // Not being able to remember the choice is not worth surfacing.
  }
}

export function messagesFor(language: Language): Messages {
  return MESSAGES[language]
}
