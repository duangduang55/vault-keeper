import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { VaultView } from '../vault/VaultView'
import { SettingsView } from '../settings/SettingsView'
import { ToastContainer } from '../common/Toast'

export function AppShell() {
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar onOpenSettings={() => setShowSettings(true)} />
      <main className="flex-1 flex flex-col overflow-hidden bg-surface-950">
        {showSettings ? (
          <SettingsView onBack={() => setShowSettings(false)} />
        ) : (
          <VaultView />
        )}
      </main>
      <ToastContainer />
    </div>
  )
}
