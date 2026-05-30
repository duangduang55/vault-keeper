import { useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { VaultView } from '../vault/VaultView'
import { SettingsView } from '../settings/SettingsView'
import { ToastContainer } from '../common/Toast'
import { SearchBar } from '../vault/SearchBar'
import { AppLogo } from '../common/AppLogo'
import { useThemeStore } from '../../stores/themeStore'
import { APP_NAME, APP_DESCRIPTION } from '../../lib/appConfig'
import type { Entry } from '../../types/entry'

export function AppShell() {
  const [showSettings, setShowSettings] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const loadTheme = useThemeStore((s) => s.loadTheme)

  useEffect(() => {
    // 已解锁，从数据库同步主题配置
    loadTheme()
  }, [loadTheme])

  const handleEditEntry = (entry: Entry) => {
    setEditingEntry(entry)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingEntry(null)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-surface-950">
      {/* 顶部栏：应用标识 + 搜索栏 — 同一行，横线在下方 */}
      <div className="flex shrink-0 border-b border-surface-800">
        <div className="w-56 flex items-center gap-1.5 px-4 py-2.5">
          <AppLogo size={36} className="rounded-[10px] shrink-0" />
          <span className="text-[15px] font-semibold text-surface-100 whitespace-nowrap shrink-0">{APP_NAME}</span>
          <span className="text-[10px] text-surface-400 truncate">{APP_DESCRIPTION}</span>
        </div>
        {!showSettings && (
          <div className="flex-1">
            <SearchBar onAdd={() => setShowForm(true)} />
          </div>
        )}
      </div>

      {/* 主体区域：侧栏导航 + 内容 */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onOpenSettings={() => setShowSettings(true)} />
        <main className="flex-1 flex flex-col overflow-hidden">
          {showSettings ? (
            <SettingsView onBack={() => setShowSettings(false)} />
          ) : (
            <VaultView
              showForm={showForm}
              editingEntry={editingEntry}
              onOpenForm={setShowForm}
              onEditEntry={handleEditEntry}
              onFormClose={handleFormClose}
            />
          )}
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}
