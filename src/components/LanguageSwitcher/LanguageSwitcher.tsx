import { useLanguage } from '../../i18n/LanguageContext'
import type { Locale } from '../../i18n/translations'
import './LanguageSwitcher.css'

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage()

  const options: Locale[] = ['pl', 'en']

  return (
    <div className="lang-switcher" role="group" aria-label={t('language')}>
      {options.map((code) => (
        <button
          key={code}
          type="button"
          className={locale === code ? 'btn toggle active' : 'btn toggle'}
          aria-pressed={locale === code}
          onClick={() => setLocale(code)}
        >
          {code === 'pl' ? t('langPl') : t('langEn')}
        </button>
      ))}
    </div>
  )
}
