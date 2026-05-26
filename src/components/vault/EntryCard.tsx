import type { Entry } from '../../types/entry'
import type { EntryType } from '../../types/common'
import { formatDate } from '../../lib/formatters'
import { getTemplate, getCategoryLabel } from '../../lib/templates'
import { CopyButton } from '../common/CopyButton'

interface EntryCardProps {
  entry: Entry
  selected: boolean
  onSelect: (entry: Entry) => void
}

/** 判断字段是否为敏感字段（不应在卡片预览中显示） */
function isSensitiveField(entryType: string, key: string, allFields: Record<string, string>): boolean {
  if (key === '_sensitive') return true
  const template = getTemplate(entryType as EntryType)
  if (template) {
    const def = template.fields.find(f => f.key === key)
    if (def) return def.type === 'password'
  }
  // 自定义字段：检查 _sensitive 元数据
  if (allFields['_sensitive']) {
    const sensitiveKeys = allFields['_sensitive'].split(',').map(s => s.trim())
    if (sensitiveKeys.includes(key)) return true
  }
  // 回退启发式
  const k = key.toLowerCase()
  return k.includes('pass') || k.includes('secret') || k.includes('key') || k.includes('token')
}

/** 获取条目的主关键字段名（供复制按钮使用） */
function getPrimarySecretKey(entryType: string, allFields: Record<string, string>): string | null {
  const template = getTemplate(entryType as EntryType)
  if (template) {
    const pwField = template.fields.find(f => f.type === 'password')
    if (pwField) return pwField.key
  }
  // 自定义条目：取第一个 _sensitive 标记的字段
  const sensitiveKeys = allFields['_sensitive']?.split(',').map(s => s.trim()) ?? []
  for (const key of Object.keys(allFields)) {
    if (key === '_sensitive') continue
    if (sensitiveKeys.includes(key)) return key
    const k = key.toLowerCase()
    if (k.includes('pass') || k.includes('secret') || k.includes('key') || k.includes('token')) return key
  }
  return null
}

export function EntryCard({ entry, selected, onSelect }: EntryCardProps) {
  const fields = JSON.parse(entry.fields || '{}') as Record<string, string>
  const nonSensitiveValues = Object.entries(fields)
    .filter(([k]) => !isSensitiveField(entry.entry_type, k, fields))
    .map(([, v]) => v)
  const preview = nonSensitiveValues.slice(0, 2).filter(Boolean).join(' · ') || '(空)'
  const label = getCategoryLabel(entry.entry_type)
  const primaryKey = getPrimarySecretKey(entry.entry_type, fields)

  return (
    <button
      onClick={() => onSelect(entry)}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-150
        ${selected
          ? 'border-primary-500/50 bg-primary-600/5 shadow-sm shadow-primary-500/5'
          : 'border-surface-700/50 bg-surface-800/50 hover:border-surface-600 hover:bg-surface-800'
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider text-primary-400">{label}</span>
          </div>
          <h3 className="font-medium text-surface-100 truncate">{entry.name}</h3>
          <div className="flex items-center justify-between gap-2 mt-1">
            <span className="text-xs text-surface-500 truncate">{preview}</span>
            {primaryKey && (
              <span onClick={(e) => e.stopPropagation()}>
                <CopyButton entryId={entry.id} fieldKey={primaryKey} />
              </span>
            )}
          </div>
        </div>
        <span className="text-[11px] text-surface-500 whitespace-nowrap shrink-0">{formatDate(entry.updated_at)}</span>
      </div>
    </button>
  )
}
