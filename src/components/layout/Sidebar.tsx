import { useState, useEffect } from 'react'
import { Lock, Settings, Key, CreditCard, Ticket, FileText, List } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { useAuthStore } from '../../stores/authStore'
import { useEntryStore } from '../../stores/entryStore'
import { Button } from '../common/Button'
import { CATEGORY_TEMPLATES } from '../../lib/templates'

interface SidebarProps {
  onOpenSettings: () => void
}

const iconMap: Record<string, typeof Key> = {
  Key,
  Lock,
  CreditCard,
  Ticket,
  FileText,
}

export function Sidebar({ onOpenSettings }: SidebarProps) {
  const { lock } = useAuthStore()
  const { filterType, filterByType } = useEntryStore()
  const [lockShortcut, setLockShortcut] = useState('')

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
    <aside className="w-56 flex flex-col bg-surface-950 border-r border-surface-700/50">
      {/* 分类导航 */}
      <nav className="flex-1 px-2.5 pt-3 pb-2 space-y-0.5 overflow-y-auto">
        <p className="px-3 pb-2 text-[10px] font-semibold text-surface-500 uppercase tracking-[0.1em]">分类</p>
        <button
          onClick={() => handleCategoryClick(null)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-all duration-200
            ${!filterType ? 'bg-primary-500/8 text-primary-400 font-medium' : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/60'}`}
        >
          <List size={16} strokeWidth={1.8} />
          全部
        </button>
        {CATEGORY_TEMPLATES.map((t) => {
          const Icon = iconMap[t.icon] || FileText
          return (
            <button
              key={t.type}
              onClick={() => handleCategoryClick(t.type)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-all duration-200
                ${filterType === t.type ? 'bg-primary-500/8 text-primary-400 font-medium' : 'text-surface-400 hover:text-surface-100 hover:bg-surface-800/60'}`}
            >
              <Icon size={16} strokeWidth={1.8} />
              {t.label}
            </button>
          )
        })}
      </nav>

      {/* 底部：设置 + 锁定 */}
      <div className="px-2.5 py-2.5 border-t border-surface-700/50 space-y-0.5">
        <Button variant="ghost" size="sm" className="w-full justify-start gap-2.5 text-surface-400" onClick={onOpenSettings}>
          <Settings size={16} strokeWidth={1.8} />
          设置
        </Button>
        <div>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2.5 text-surface-400" onClick={() => lock()}>
            <Lock size={16} strokeWidth={1.8} />
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
