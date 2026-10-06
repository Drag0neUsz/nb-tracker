import { AppStoreProvider, useAppStore } from './store/AppStore'
import { LanguageProvider, useLanguage } from './i18n/LanguageContext'
import { Calendar } from './components/Calendar/Calendar'
import { SidePanel } from './components/SidePanel/SidePanel'
import { LanguageSwitcher } from './components/LanguageSwitcher/LanguageSwitcher'
import './App.css'

function Shell() {
  const { ready } = useAppStore()
  const { t } = useLanguage()

  if (!ready) {
    return (
      <div className="app-loading">
        <p>{t('loading')}</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <header className="app-topbar">
        <LanguageSwitcher />
      </header>
      <main className="app-main">
        <Calendar />
      </main>
      <SidePanel />
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <AppStoreProvider>
        <Shell />
      </AppStoreProvider>
    </LanguageProvider>
  )
}
