import { useState } from 'react'
import { Upload, Download, FolderOpen } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { save, open } from '@tauri-apps/plugin-dialog'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { toast } from '../common/Toast'
import { Modal } from '../common/Modal'

export function BackupSection() {
  const [showExport, setShowExport] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [password, setPassword] = useState('')
  const [path, setPath] = useState('')
  const [loading, setLoading] = useState(false)

  const pickExportPath = async () => {
    const now = new Date()
    const ts = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`
    const selected = await save({
      defaultPath: `vault-keeper-backup-${ts}.bin`,
      filters: [{ name: '备份文件', extensions: ['bin'] }],
    })
    if (selected) setPath(selected)
  }

  const pickImportPath = async () => {
    const selected = await open({
      filters: [{ name: '备份文件', extensions: ['bin'] }],
      multiple: false,
    })
    if (selected) setPath(selected as string)
  }

  const handleExport = async () => {
    if (!password) { toast('请输入备份密码', 'warning'); return }
    setLoading(true)
    try {
      const result = await invoke<{ path: string; entry_count: number; size_bytes: number }>('export_backup', {
        outputPath: path || undefined,
        password,
      })
      toast(`已导出 ${result.entry_count} 条条目到 ${result.path}`, 'success')
      setShowExport(false)
      setPassword('')
    } catch (e) {
      toast(`导出失败: ${e}`, 'error')
    }
    setLoading(false)
  }

  const handleImport = async () => {
    if (!password) { toast('请输入备份密码', 'warning'); return }
    setLoading(true)
    try {
      const result = await invoke<{ imported: number; skipped: number }>('import_backup', {
        inputPath: path || undefined,
        password,
      })
      toast(`已导入 ${result.imported} 条（跳过 ${result.skipped} 条）`, 'success')
      setShowImport(false)
      setPassword('')
    } catch (e) {
      toast(`导入失败: ${e}`, 'error')
    }
    setLoading(false)
  }

  return (
    <>
      <div className="bg-surface-800/50 border border-surface-700/50 rounded-xl p-4 space-y-3">
        <h3 className="text-sm font-medium text-surface-100">数据备份</h3>
        <p className="text-xs text-surface-500">加密导出所有条目，或从备份文件中恢复数据</p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowExport(true)}>
            <Download size={15} />
            导出备份
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
            <Upload size={15} />
            导入备份
          </Button>
        </div>
      </div>

      <Modal open={showExport} onClose={() => { setShowExport(false); setPassword(''); setPath('') }} title="导出备份" size="sm">
        <div className="space-y-4">
          <Input label="备份密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="设置备份加密密码" />
          <div>
            <label className="block text-xs font-medium text-surface-300 mb-1">保存路径</label>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 placeholder-surface-500 read-only:opacity-60"
                value={path || '点击右侧按钮选择保存路径'}
                readOnly
              />
              <Button variant="secondary" size="sm" onClick={pickExportPath}>
                <FolderOpen size={15} />
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => { setShowExport(false); setPassword(''); setPath('') }}>取消</Button>
            <Button onClick={handleExport} disabled={loading || !path}>{loading ? '导出中...' : '导出'}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={showImport} onClose={() => { setShowImport(false); setPassword(''); setPath('') }} title="导入备份" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-surface-300 mb-1">备份文件</label>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-surface-800 border border-surface-700 rounded-lg px-3 py-2 text-sm text-surface-200 placeholder-surface-500 read-only:opacity-60"
                value={path || '点击右侧按钮选择备份文件'}
                readOnly
              />
              <Button variant="secondary" size="sm" onClick={pickImportPath}>
                <FolderOpen size={15} />
              </Button>
            </div>
          </div>
          <Input label="备份密码" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="输入备份加密密码" />
          <p className="text-xs text-surface-500">导入会合并条目到当前库，同名条目将被跳过</p>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => { setShowImport(false); setPassword(''); setPath('') }}>取消</Button>
            <Button onClick={handleImport} disabled={loading}>{loading ? '导入中...' : '导入'}</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
