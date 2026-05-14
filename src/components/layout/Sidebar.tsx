import { useState, useEffect } from 'react'
import { Lock, Settings } from 'lucide-react'
import { getName } from '@tauri-apps/api/app'
import { invoke } from '@tauri-apps/api/core'
import { useAuthStore } from '../../stores/authStore'
import { useEntryStore } from '../../stores/entryStore'
import { Button } from '../common/Button'
import { CATEGORY_TEMPLATES } from '../../lib/templates'

interface SidebarProps {
  onOpenSettings: () => void
}

export function Sidebar({ onOpenSettings }: SidebarProps) {
  const { lock } = useAuthStore()
  const { filterType, filterByType } = useEntryStore()
  const [appName, setAppName] = useState('Vault Keeper')
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const [lockShortcut, setLockShortcut] = useState('')

  useEffect(() => {
    getName().then(setAppName).catch(() => {})
    let iconUrlCleanup: string | null = null
    invoke<number[]>('get_app_icon')
      .then((data) => {
        const blob = new Blob([new Uint8Array(data)], { type: 'image/png' })
        const url = URL.createObjectURL(blob)
        iconUrlCleanup = url
        setIconUrl(url)
      })
      .catch(() => {})
    return () => {
      if (iconUrlCleanup) URL.revokeObjectURL(iconUrlCleanup)
    }
  }, [])

  // 加载锁定快捷键
  useEffect(() => {
    invoke<{ lock_shortcut?: string }>('get_app_config')
      .then((config) => setLockShortcut(config.lock_shortcut || ''))
      .catch(() => {})
  }, [])

  const handleCategoryClick = (type: string | null) => {
    if (type === filterType) type = null
    filterByType(type)
  }

  return (
    <aside className="w-56 flex flex-col bg-surface-900 border-r border-surface-700/50">
      <div className="p-4 border-b border-surface-700/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden">
            {iconUrl ? (
              <img src={iconUrl} alt={appName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-surface-400">{appName.charAt(0)}</span>
            )}
          </div>
          <div>
            <h1 className="text-sm font-semibold text-surface-100">{appName}</h1>
            <p className="text-[10px] text-surface-500">关键信息管理器</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        <p className="px-3 py-2 text-[11px] font-medium text-surface-500 uppercase tracking-wider">分类</p>
        <button
          onClick={() => handleCategoryClick(null)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
            ${!filterType ? 'bg-primary-600/10 text-primary-400' : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'}`}
        >
          <span className="text-base">📋</span>
          全部
        </button>
        {CATEGORY_TEMPLATES.map((t) => (
          <button
            key={t.type}
            onClick={() => handleCategoryClick(t.type)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
              ${filterType === t.type ? 'bg-primary-600/10 text-primary-400' : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800'}`}
          >
            <span className="text-base">{t.icon === 'Key' ? '🔑' : t.icon === 'Lock' ? '🔒' : t.icon === 'CreditCard' ? '🪪' : t.icon === 'Ticket' ? '🎫' : '📄'}</span>
            {t.label}
          </button>
        ))}
      </nav>

      <div className="p-2 border-t border-surface-700/50 space-y-0.5">
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onOpenSettings}>
          <Settings size={16} />
          设置
        </Button>
        <div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => lock()}>
            <Lock size={16} />
            锁定
          </Button>
          {lockShortcut && (
            <p className="text-[10px] text-surface-500 text-center mt-0.5">{lockShortcut}</p>
          )}
        </div>
      </div>
    </aside>
  )
}
