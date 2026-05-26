import { useState, useEffect } from 'react'
import { getName } from '@tauri-apps/api/app'
import { invoke } from '@tauri-apps/api/core'
import { Sidebar } from './Sidebar'
import { VaultView } from '../vault/VaultView'
import { SettingsView } from '../settings/SettingsView'
import { ToastContainer } from '../common/Toast'
import { SearchBar } from '../vault/SearchBar'
import { useThemeStore } from '../../stores/themeStore'
import type { Entry } from '../../types/entry'

export function AppShell() {
  const [showSettings, setShowSettings] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const [appName, setAppName] = useState('Vault Keeper')
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const loadTheme = useThemeStore((s) => s.loadTheme)

  useEffect(() => {
    // 已解锁，从数据库同步主题配置
    loadTheme()
    getName().then(setAppName).catch(() => {})
    let cleanup: string | null = null
    invoke<number[]>('get_app_icon')
      .then((data) => {
        const blob = new Blob([new Uint8Array(data)], { type: 'image/png' })
        const url = URL.createObjectURL(blob)
        cleanup = url
        setIconUrl(url)
      })
      .catch(() => {})
    return () => { if (cleanup) URL.revokeObjectURL(cleanup) }
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
        <div className="w-56 flex items-center gap-2.5 px-4 py-3">
          <div className="w-7 h-7 rounded-[8px] flex items-center justify-center overflow-hidden shrink-0">
            {iconUrl ? (
              <img src={iconUrl} alt={appName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-semibold text-surface-400">{appName.charAt(0)}</span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-[13px] font-semibold text-surface-100 truncate">{appName}</h1>
            <p className="text-[10px] text-surface-400">关键信息管理器</p>
          </div>
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
