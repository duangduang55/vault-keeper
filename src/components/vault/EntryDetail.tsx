import { X, Edit3, Trash2 } from 'lucide-react'
import type { Entry } from '../../types/entry'
import type { EntryType } from '../../types/common'
import { formatDate } from '../../lib/formatters'
import { getTemplate, getCategoryLabel } from '../../lib/templates'
import { CopyButton } from '../common/CopyButton'
import { Button } from '../common/Button'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { useEntryStore } from '../../stores/entryStore'
import { toast } from '../common/Toast'
import { useState, useMemo } from 'react'

interface EntryDetailProps {
  entry: Entry
  onEdit: () => void
}

function isPasswordField(key: string): boolean {
  const k = key.toLowerCase()
  return k.includes('pass') || k.includes('secret') || k.includes('key') || k.includes('token')
}

export function EntryDetail({ entry, onEdit }: EntryDetailProps) {
  const { deleteEntry, selectEntry } = useEntryStore()
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const fields = JSON.parse(entry.fields || '{}') as Record<string, string>
  const [visibleFields, setVisibleFields] = useState<Set<string>>(new Set())
  const template = useMemo(() => getTemplate(entry.entry_type as EntryType), [entry.entry_type])

  const getFieldLabel = (key: string): string => {
    return template?.fields.find((f) => f.key === key)?.label ?? key
  }

  const isMultilineField = (key: string, value: string): boolean => {
    if (value.includes('\n')) return true
    return template?.fields.some((f) => f.key === key && f.multiline) ?? false
  }

  const handleDelete = async () => {
    setDeleting(true)
    const ok = await deleteEntry(entry.id)
    if (ok) {
      toast('已删除', 'success')
      selectEntry(null)
    } else {
      toast('删除失败', 'error')
    }
    setDeleting(false)
    setShowDelete(false)
  }

  const toggleVisibility = (key: string) => {
    setVisibleFields((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-700/50">
          <h3 className="text-sm font-medium text-surface-100 truncate flex-1">{entry.name}</h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit3 size={15} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowDelete(true)}>
              <Trash2 size={15} className="text-red-400" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => selectEntry(null)}>
              <X size={15} />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-1">
            <p className="text-[11px] text-surface-500 uppercase tracking-wider">分类</p>
            <p className="text-sm text-surface-200">{getCategoryLabel(entry.entry_type)}</p>
          </div>

          <div className="space-y-3">
            <p className="text-[11px] text-surface-500 uppercase tracking-wider">字段</p>
            {Object.entries(fields).map(([key, value]) => {
              const visible = visibleFields.has(key) || !isPasswordField(key)
              return (
                <div key={key} className="bg-surface-800 rounded-lg p-3 border border-surface-700/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-surface-400">{getFieldLabel(key)}</span>
                    <div className="flex items-center gap-1">
                      <CopyButton entryId={entry.id} fieldKey={key} value={value} />
                      {isPasswordField(key) && value.length > 0 && (
                        <button
                          onClick={() => toggleVisibility(key)}
                          className="p-1 rounded text-surface-500 hover:text-surface-200 transition-colors"
                        >
                          {visible ? '🙈' : '👁️'}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className={`text-sm ${isMultilineField(key, value) ? 'whitespace-pre-wrap' : 'font-mono break-all'} ${visible ? 'text-surface-100' : 'text-surface-100/30 select-none'}`}>
                    {visible ? value : '•'.repeat(Math.min(value.length, 20))}
                  </p>
                </div>
              )
            })}
          </div>

          <div className="border-t border-surface-700/50 pt-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-surface-500">创建时间</span>
              <span className="text-surface-400">{formatDate(entry.created_at)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-surface-500">更新时间</span>
              <span className="text-surface-400">{formatDate(entry.updated_at)}</span>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="删除条目"
        message={`确定要删除「${entry.name}」吗？此操作不可恢复。`}
        loading={deleting}
      />
    </>
  )
}
