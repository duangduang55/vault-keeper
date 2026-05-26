import { useState, useEffect } from 'react'
import { ArrowLeft, Clock, Keyboard, Lock, KeyRound, SunMoon, Moon, Sun } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '../common/Button'
import { BackupSection } from './BackupSection'
import { IcloudSection } from './IcloudSection'
import { ShortcutRecorder } from './ShortcutRecorder'
import { toast } from '../common/Toast'
import { useThemeStore } from '../../stores/themeStore'
import type { AppConfig } from '../../types/common'

interface SettingsViewProps {
  onBack: () => void
}

export function SettingsView({ onBack }: SettingsViewProps) {
  const [autoLockMinutes, setAutoLockMinutes] = useState(5)
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [shortcut, setShortcut] = useState('CmdOrCtrl+Shift+V')
  const [shortcutInput, setShortcutInput] = useState('')
  const [savingShortcut, setSavingShortcut] = useState(false)
  const [lockShortcut, setLockShortcut] = useState('CmdOrCtrl+Shift+L')
  const [lockShortcutInput, setLockShortcutInput] = useState('')
  const [savingLockShortcut, setSavingLockShortcut] = useState(false)

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [appVersion, setAppVersion] = useState('')
  const { theme, setTheme } = useThemeStore()

  useEffect(() => {
    import('@tauri-apps/api/app').then(({ getVersion }) =>
      getVersion().then(setAppVersion)
    ).catch(() => setAppVersion('0.2.0'))
  }, [])

  useEffect(() => {
    (async () => {
      try {
        const config = await invoke<AppConfig>('get_app_config')
        setAutoLockMinutes(Math.round(config.auto_lock_seconds / 60))
        setShortcut(config.global_shortcut)
        setShortcutInput(config.global_shortcut)
        setLockShortcut(config.lock_shortcut || 'CmdOrCtrl+Shift+L')
        setLockShortcutInput(config.lock_shortcut || 'CmdOrCtrl+Shift+L')
      } catch { /* use defaults */ }
      setLoadingConfig(false)
    })()
  }, [])

  const handleAutoLockChange = async (value: number) => {
    const minutes = Math.max(1, Math.min(60, value))
    setAutoLockMinutes(minutes)
    try {
      await invoke('update_app_config', { autoLockSeconds: minutes * 60 })
      toast(`自动锁定时间已设为 ${minutes} 分钟`, 'success')
    } catch (e) {
      toast(`设置失败: ${e}`, 'error')
    }
  }

  const handleShortcutSave = async () => {
    setSavingShortcut(true)
    try {
      await invoke('update_app_config', { globalShortcut: shortcutInput })
      setShortcut(shortcutInput)
      toast(`快捷键已设为 ${shortcutInput}`, 'success')
    } catch (e) {
      toast(`快捷键设置失败: ${e}`, 'error')
    }
    setSavingShortcut(false)
  }

  const handleLockShortcutSave = async () => {
    setSavingLockShortcut(true)
    try {
      await invoke('update_app_config', { lockShortcut: lockShortcutInput })
      setLockShortcut(lockShortcutInput)
      toast(`锁定快捷键已设为 ${lockShortcutInput}`, 'success')
    } catch (e) {
      toast(`锁定快捷键设置失败: ${e}`, 'error')
    }
    setSavingLockShortcut(false)
  }

  const handleThemeChange = async (t: 'auto' | 'dark' | 'light') => {
    await setTheme(t)
    const labels: Record<string, string> = { auto: '自动', dark: '暗色', light: '亮色' }
    toast(`主题已切换为 ${labels[t]}`, 'success')
  }

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast('请填写所有密码字段', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      toast('两次输入的新密码不一致', 'error')
      return
    }
    if (newPassword.length < 6) {
      toast('新密码长度不能少于 6 位', 'error')
      return
    }
    setChangingPassword(true)
    try {
      await invoke('change_master_password', { oldPassword, newPassword })
      toast('主密码已修改成功', 'success')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e) {
      toast(`修改失败: ${e}`, 'error')
    }
    setChangingPassword(false)
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={18} />
        </Button>
        <h2 className="text-base font-semibold text-surface-100">设置</h2>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-3">
        {/* Auto Lock */}
        <section className="bg-surface-800 border border-surface-800 rounded-[10px] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-surface-400" />
            <h3 className="text-sm font-medium text-surface-100">自动锁定</h3>
          </div>
          <p className="text-xs text-surface-500">保险箱无操作后自动锁定，需要重新输入主密码解锁</p>
          {!loadingConfig && (
            <div className="flex items-center gap-3 pt-1">
              <input
                type="range"
                min={1}
                max={60}
                value={autoLockMinutes}
                onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
                onMouseUp={() => handleAutoLockChange(autoLockMinutes)}
                onTouchEnd={() => handleAutoLockChange(autoLockMinutes)}
                className="flex-1 accent-primary-500"
              />
              <div className="flex items-center gap-1 min-w-[90px]">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={autoLockMinutes}
                  onChange={(e) => handleAutoLockChange(Number(e.target.value))}
                  className="w-12 bg-surface-800 border border-surface-600 rounded-[6px] px-2 py-1 text-sm text-surface-200 text-center focus:outline-none focus:ring-2 focus:ring-primary-500/50"
                />
                <span className="text-xs text-surface-400">分钟</span>
              </div>
            </div>
          )}
        </section>

        {/* File Backup */}
        <BackupSection />

        {/* iCloud Backup */}
        <IcloudSection />

        {/* Global Shortcut */}
        <section className="bg-surface-800 border border-surface-800 rounded-[10px] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Keyboard size={16} className="text-surface-400" />
            <h3 className="text-sm font-medium text-surface-100">唤出快捷键</h3>
          </div>
          <p className="text-xs text-surface-500">设置全局快捷键快速唤出或隐藏 Vault Keeper 窗口</p>
          <p className="text-xs text-surface-400">当前: <code className="bg-surface-900 px-1.5 py-0.5 rounded-[4px] text-primary-400 text-[11px]">{shortcut}</code></p>
          <div className="flex gap-2">
            <ShortcutRecorder value={shortcutInput} onChange={setShortcutInput} />
            <Button size="sm" onClick={handleShortcutSave} disabled={savingShortcut || shortcutInput === shortcut}>
              {savingShortcut ? '保存中...' : '保存'}
            </Button>
          </div>
        </section>

        {/* Lock Shortcut */}
        <section className="bg-surface-800 border border-surface-800 rounded-[10px] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-surface-400" />
            <h3 className="text-sm font-medium text-surface-100">锁定快捷键</h3>
          </div>
          <p className="text-xs text-surface-500">按下快捷键快速锁定保险箱，无需手动点击锁定</p>
          <p className="text-xs text-surface-400">当前: <code className="bg-surface-900 px-1.5 py-0.5 rounded-[4px] text-primary-400 text-[11px]">{lockShortcut}</code></p>
          <div className="flex gap-2">
            <ShortcutRecorder value={lockShortcutInput} onChange={setLockShortcutInput} />
            <Button size="sm" onClick={handleLockShortcutSave} disabled={savingLockShortcut || lockShortcutInput === lockShortcut}>
              {savingLockShortcut ? '保存中...' : '保存'}
            </Button>
          </div>
        </section>

        {/* Theme */}
        <section className="bg-surface-800 border border-surface-800 rounded-[10px] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <SunMoon size={16} className="text-surface-400" />
            <h3 className="text-sm font-medium text-surface-100">主题设置</h3>
          </div>
          <p className="text-xs text-surface-500">选择应用的外观主题，自动模式会跟随系统设置</p>
          <div className="flex gap-2 pt-1">
            {(['auto', 'dark', 'light'] as const).map((t) => (
              <ThemeOption
                key={t}
                value={t}
                current={theme}
                onChange={handleThemeChange}
              />
            ))}
          </div>
        </section>

        {/* Change Master Password */}
        <section className="bg-surface-800 border border-surface-800 rounded-[10px] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-surface-400" />
            <h3 className="text-sm font-medium text-surface-100">修改主密码</h3>
          </div>
          <p className="text-xs text-surface-500">修改保险箱的主密码，修改后需使用新密码解锁</p>
          <div className="space-y-2">
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="当前密码"
              className="w-full bg-surface-800 border border-surface-600 rounded-[10px] px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all duration-200"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新密码"
              className="w-full bg-surface-800 border border-surface-600 rounded-[10px] px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all duration-200"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="确认新密码"
              className="w-full bg-surface-800 border border-surface-600 rounded-[10px] px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all duration-200"
            />
            <Button onClick={handleChangePassword} disabled={changingPassword} className="w-full">
              {changingPassword ? '修改中...' : '修改密码'}
            </Button>
          </div>
        </section>

        {/* About */}
        <section className="bg-surface-800 border border-surface-800 rounded-[10px] p-4 space-y-2">
          <h3 className="text-sm font-medium text-surface-100">关于 Vault Keeper</h3>
          <p className="text-xs text-surface-400">版本 {appVersion || '0.2.0'}</p>
          <p className="text-xs text-surface-500">基于 Tauri 2.0 + React + SQLCipher 构建</p>
          <p className="text-xs text-surface-500">所有数据使用主密码 + AES-256 加密存储在本地</p>
        </section>
      </div>
    </div>
  )
}

const THEME_OPTIONS: { value: 'auto' | 'dark' | 'light'; label: string }[] = [
  { value: 'auto', label: '自动' },
  { value: 'dark', label: '暗色' },
  { value: 'light', label: '亮色' },
]

function ThemeOption({ value, current, onChange }: {
  value: 'auto' | 'dark' | 'light'
  current: 'auto' | 'dark' | 'light'
  onChange: (v: 'auto' | 'dark' | 'light') => void
}) {
  const option = THEME_OPTIONS.find((o) => o.value === value)!
  const isActive = value === current

  return (
    <button
      onClick={() => onChange(value)}
      className={`flex-1 flex flex-col items-center gap-2 px-3 py-3 rounded-[10px] text-sm transition-all duration-200 border
        ${isActive
          ? 'bg-primary-500/10 border-primary-500 text-primary-400'
          : 'bg-surface-900 border-surface-600 text-surface-400 hover:border-surface-500 hover:text-surface-300'
        }`}
    >
      {value === 'auto' ? <SunMoon size={18} /> : value === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
      <span>{option.label}</span>
    </button>
  )
}
