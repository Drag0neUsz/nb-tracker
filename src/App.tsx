import { AppStoreProvider, useAppStore } from './store/AppStore'
import { Calendar } from './components/Calendar/Calendar'
import { SidePanel } from './components/SidePanel/SidePanel'
import './App.css'

function Shell() {
  const { ready } = useAppStore()

  if (!ready) {
    return (
      <div className="app-loading">
        <p>Loading tracker…</p>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <main className="app-main">
        <Calendar />
      </main>
      <SidePanel />
    </div>
  )
}

export default function App() {
  return (
    <AppStoreProvider>
      <Shell />
    </AppStoreProvider>
  )
}
