import { useState, useEffect } from 'react'
import { ArrowLeft, Clock, Keyboard, Lock, KeyRound } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '../common/Button'
import { BackupSection } from './BackupSection'
import { IcloudSection } from './IcloudSection'
import { toast } from '../common/Toast'
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

  // 修改密码
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const config = await invoke<AppConfig>('get_app_config')
        setAutoLockMinutes(Math.round(config.auto_lock_seconds / 60))
        setShortcut(config.global_shortcut)
        setShortcutInput(config.global_shortcut)
        setLockShortcut(config.lock_shortcut || 'CmdOrCtrl+Shift+L')
        setLockShortcutInput(config.lock_shortcut || 'CmdOrCtrl+Shift+L')
      } catch { /* 使用默认值 */ }
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
      <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-700/50 bg-surface-900/50">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={18} />
        </Button>
        <h2 className="text-base font-semibold text-surface-100">设置</h2>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* 自动锁定 */}
        <div className="bg-surface-800/50 border border-surface-700/50 rounded-xl p-4 space-y-3">
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
                  className="w-12 bg-surface-800 border border-surface-700 rounded px-2 py-1 text-sm text-surface-200 text-center"
                />
                <span className="text-xs text-surface-400">分钟</span>
              </div>
            </div>
          )}
        </div>

        {/* 文件备份 */}
        <BackupSection />

        {/* iCloud 备份 */}
        <IcloudSection />

        {/* 全局快捷键（唤出/隐藏） */}
        <div className="bg-surface-800/50 border border-surface-700/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Keyboard size={16} className="text-surface-400" />
            <h3 className="text-sm font-medium text-surface-100">唤出快捷键</h3>
          </div>
          <p className="text-xs text-surface-500">设置全局快捷键快速唤出或隐藏 Vault Keeper 窗口</p>
          <p className="text-xs text-surface-400">当前: <code className="bg-surface-900 px-1.5 py-0.5 rounded text-primary-400">{shortcut}</code></p>
          <div className="flex gap-2">
            <input
              value={shortcutInput}
              onChange={(e) => setShortcutInput(e.target.value)}
              placeholder="例如: CmdOrCtrl+Shift+V"
              className="flex-1 bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
            />
            <Button size="sm" onClick={handleShortcutSave} disabled={savingShortcut || shortcutInput === shortcut}>
              {savingShortcut ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>

        {/* 锁定快捷键 */}
        <div className="bg-surface-800/50 border border-surface-700/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-surface-400" />
            <h3 className="text-sm font-medium text-surface-100">锁定快捷键</h3>
          </div>
          <p className="text-xs text-surface-500">按下快捷键快速锁定保险箱，无需手动点击锁定</p>
          <p className="text-xs text-surface-400">当前: <code className="bg-surface-900 px-1.5 py-0.5 rounded text-primary-400">{lockShortcut}</code></p>
          <div className="flex gap-2">
            <input
              value={lockShortcutInput}
              onChange={(e) => setLockShortcutInput(e.target.value)}
              placeholder="例如: CmdOrCtrl+Shift+L"
              className="flex-1 bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
            />
            <Button size="sm" onClick={handleLockShortcutSave} disabled={savingLockShortcut || lockShortcutInput === lockShortcut}>
              {savingLockShortcut ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>

        {/* 修改主密码 */}
        <div className="bg-surface-800/50 border border-surface-700/50 rounded-xl p-4 space-y-3">
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
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="新密码"
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="确认新密码"
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <Button onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? '修改中...' : '修改密码'}
            </Button>
          </div>
        </div>

        {/* 关于 */}
        <div className="bg-surface-800/50 border border-surface-700/50 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-medium text-surface-100">关于 Vault Keeper</h3>
          <p className="text-xs text-surface-400">版本 0.1.1</p>
          <p className="text-xs text-surface-500">基于 Tauri 2.0 + React + SQLCipher 构建</p>
          <p className="text-xs text-surface-500">所有数据使用主密码 + AES-256 加密存储在本地</p>
        </div>
      </div>
    </div>
  )
}
