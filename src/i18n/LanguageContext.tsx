import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { enUS, pl } from 'date-fns/locale'
import type { Locale as DateFnsLocale } from 'date-fns'
import {
  DEFAULT_LOCALE,
  translate,
  translations,
  type Locale,
  type MessageParams,
  type TranslationKey,
} from './translations'

const STORAGE_KEY = 'nb-tracker-locale'

interface LanguageContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey, params?: MessageParams) => string
  dateLocale: DateFnsLocale
  weekdaysShort: readonly string[]
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'pl' || stored === 'en') return stored
  } catch {
    // ignore
  }
  return DEFAULT_LOCALE
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale)

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const t = useCallback(
    (key: TranslationKey, params?: MessageParams) => translate(locale, key, params),
    [locale],
  )

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      dateLocale: locale === 'pl' ? pl : enUS,
      weekdaysShort: translations[locale].weekdaysShort,
    }),
    [locale, setLocale, t],
  )

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
