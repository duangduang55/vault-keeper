import type { Entry } from '../../types/entry'
import { EntryCard } from './EntryCard'

interface EntryListProps {
  entries: Entry[]
  onSelect: (entry: Entry) => void
  selectedId: string | null
}

export function EntryList({ entries, onSelect, selectedId }: EntryListProps) {
  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
      {entries.map((entry) => (
        <EntryCard
          key={entry.id}
          entry={entry}
          selected={entry.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
