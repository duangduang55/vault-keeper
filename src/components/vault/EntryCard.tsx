import type { Entry } from '../../types/entry'
import { formatDate } from '../../lib/formatters'
import { getCategoryLabel } from '../../lib/templates'

interface EntryCardProps {
  entry: Entry
  selected: boolean
  onSelect: (entry: Entry) => void
}

export function EntryCard({ entry, selected, onSelect }: EntryCardProps) {
  const fields = JSON.parse(entry.fields || '{}') as Record<string, string>
  const preview = Object.values(fields).slice(0, 2).filter(Boolean).join(' · ') || '(空)'
  const label = getCategoryLabel(entry.entry_type)

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
          <p className="text-xs text-surface-500 mt-1 truncate">{preview}</p>
        </div>
        <span className="text-[11px] text-surface-500 whitespace-nowrap shrink-0">{formatDate(entry.updated_at)}</span>
      </div>
    </button>
  )
}
