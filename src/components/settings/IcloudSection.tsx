import { useState, useEffect } from 'react'
import { Cloud, HardDrive, RefreshCw, Download } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { Modal } from '../common/Modal'
import { toast } from '../common/Toast'

interface IcloudStatus {
  available: boolean
  path: string
}

interface BackupFile {
  filename: string
  size_bytes: number
  modified: number
}

export function IcloudSection() {
  const [status, setStatus] = useState<IcloudStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [showBackup, setShowBackup] = useState(false)
  const [showRestore, setShowRestore] = useState(false)
  const [backupPassword, setBackupPassword] = useState('')
  const [restorePassword, setRestorePassword] = useState('')
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([])
  const [selectedFile, setSelectedFile] = useState('')
  const [backupInterval, setBackupInterval] = useState('0')
  const [configLoaded, setConfigLoaded] = useState(false)

  useEffect(() => {
    invoke<IcloudStatus>('get_icloud_status').then(setStatus).catch(() => {})

    // 监听来自托盘菜单的 iCloud 备份事件
    const unlisten = listen('trigger-icloud-backup', () => {
      setShowBackup(true)
    })
    return () => { unlisten.then((f) => f()) }
  }, [])

  const refreshStatus = async () => {
    const s = await invoke<IcloudStatus>('get_icloud_status')
    setStatus(s)
    if (!s.available) {
      toast('iCloud Drive 不可用，请确认已登录 iCloud', 'warning')
    }
  }

  const handleManualBackup = async () => {
    if (!backupPassword) { toast('请输入备份密码', 'warning'); return }
    setLoading(true)
    try {
      const result = await invoke<{ filename: string; entry_count: number; size_bytes: number }>('icloud_backup', {
        password: backupPassword,
      })
      toast(`已备份 ${result.entry_count} 条到 iCloud (${result.filename})`, 'success')
      setShowBackup(false)
      setBackupPassword('')
    } catch (e) {
      toast(`iCloud 备份失败: ${e}`, 'error')
    }
    setLoading(false)
  }

  const handleRestore = async () => {
    if (!restorePassword) { toast('请输入备份密码', 'warning'); return }
    if (!selectedFile) { toast('请选择备份文件', 'warning'); return }
    setLoading(true)
    try {
      const result = await invoke<{ imported: number; skipped: number }>('icloud_restore', {
        password: restorePassword,
        filename: selectedFile,
      })
      toast(`已恢复 ${result.imported} 条（跳过 ${result.skipped} 条）`, 'success')
      setShowRestore(false)
      setRestorePassword('')
    } catch (e) {
      toast(`恢复失败: ${e}`, 'error')
    }
    setLoading(false)
  }

  const loadBackupFiles = async () => {
    try {
      const files = await invoke<BackupFile[]>('icloud_list_backups')
      setBackupFiles(files)
    } catch (e) {
      toast(`获取备份列表失败: ${e}`, 'error')
    }
  }

  const openRestore = async () => {
    setShowRestore(true)
    await loadBackupFiles()
  }

  const handleIntervalChange = async (value: string) => {
    setBackupInterval(value)
    try {
      const intervalSecs = value === '0' ? 0 : Number(value)
      await invoke('update_app_config', { autoBackupInterval: intervalSecs })
      toast(value === '0' ? '自动备份已关闭' : `自动备份间隔已设置`, 'success')
    } catch (e) {
      toast(`设置失败: ${e}`, 'error')
    }
  }

  const loadConfig = async () => {
    try {
      const config = await invoke<{ auto_backup_interval: number }>('get_app_config')
      setBackupInterval(String(config.auto_backup_interval))
      setConfigLoaded(true)
    } catch { /* 使用默认值 */ }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  return (
    <>
      <div className="bg-surface-800/50 border border-surface-700/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Cloud size={16} className="text-surface-400" />
          <h3 className="text-sm font-medium text-surface-100">iCloud 备份</h3>
          {status && (
            <span className={`ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${status.available ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${status.available ? 'bg-green-400' : 'bg-yellow-400'}`} />
              {status.available ? '可用' : '不可用'}
            </span>
          )}
        </div>
        <p className="text-xs text-surface-500">将加密备份存储到 iCloud Drive，数据安全跨设备可用</p>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => { refreshStatus(); setShowBackup(true) }}>
            <Cloud size={15} />
            备份到 iCloud
          </Button>
          <Button variant="secondary" size="sm" onClick={openRestore}>
            <HardDrive size={15} />
            从 iCloud 恢复
          </Button>
        </div>

        {configLoaded && (
          <div className="pt-1">
            <label className="block text-xs font-medium text-surface-400 mb-1.5">自动备份间隔</label>
            <select
              value={backupInterval}
              onChange={(e) => handleIntervalChange(e.target.value)}
              className="w-full bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="0">关闭</option>
              <option value="3600">每小时</option>
              <option value="21600">每 6 小时</option>
              <option value="86400">每天</option>
            </select>
          </div>
        )}
      </div>

      {/* 手动备份弹窗 */}
      <Modal open={showBackup} onClose={() => { setShowBackup(false); setBackupPassword('') }} title="iCloud 手动备份" size="sm">
        <div className="space-y-4">
          <Input label="备份密码" type="password" value={backupPassword} onChange={(e) => setBackupPassword(e.target.value)} placeholder="设置备份加密密码" />
          <p className="text-xs text-surface-500">备份文件将使用 AES-256-GCM 加密后存储到 iCloud Drive</p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => { setShowBackup(false); setBackupPassword('') }}>取消</Button>
            <Button onClick={handleManualBackup} disabled={loading}>{loading ? '备份中...' : '开始备份'}</Button>
          </div>
        </div>
      </Modal>

      {/* 从 iCloud 恢复弹窗 */}
      <Modal open={showRestore} onClose={() => { setShowRestore(false); setRestorePassword(''); setSelectedFile('') }} title="从 iCloud 恢复" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-surface-300 mb-1.5">选择备份文件</label>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {backupFiles.length === 0 ? (
                <p className="text-xs text-surface-500 py-2">iCloud 中没有找到备份文件</p>
              ) : (
                backupFiles.map((f) => (
                  <button
                    key={f.filename}
                    onClick={() => setSelectedFile(f.filename)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                      selectedFile === f.filename
                        ? 'bg-primary-600/10 text-primary-400 border border-primary-500/30'
                        : 'text-surface-300 hover:bg-surface-700/50 border border-transparent'
                    }`}
                  >
                    <span className="font-medium">{f.filename}</span>
                    <span className="text-surface-500 ml-2">({(f.size_bytes / 1024).toFixed(1)} KB)</span>
                  </button>
                ))
              )}
            </div>
            {backupFiles.length > 0 && (
              <button onClick={loadBackupFiles} className="flex items-center gap-1 text-[10px] text-primary-400 hover:text-primary-300 mt-1">
                <RefreshCw size={10} />
                刷新列表
              </button>
            )}
          </div>
          <Input label="备份密码" type="password" value={restorePassword} onChange={(e) => setRestorePassword(e.target.value)} placeholder="输入备份加密密码" />
          <p className="text-xs text-surface-500">从 iCloud 备份恢复数据，现有条目不会被覆盖（同名条目保留）</p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => { setShowRestore(false); setRestorePassword(''); setSelectedFile('') }}>取消</Button>
            <Button onClick={handleRestore} disabled={loading || !selectedFile}>{loading ? '恢复中...' : <><Download size={15} />恢复</>}</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
