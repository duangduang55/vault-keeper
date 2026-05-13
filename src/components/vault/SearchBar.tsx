import { useState, useEffect, useRef } from 'react'
import { Search, Plus, Filter } from 'lucide-react'
import { useEntryStore } from '../../stores/entryStore'
import { CATEGORY_TEMPLATES } from '../../lib/templates'
import { Button } from '../common/Button'

interface SearchBarProps {
  onAdd: () => void
}

export function SearchBar({ onAdd }: SearchBarProps) {
  const { searchQuery, setSearchQuery, filterType, filterByType, loadEntries, searchEntries } = useEntryStore()
  const [showFilter, setShowFilter] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (searchQuery.trim()) {
        searchEntries(searchQuery)
      } else {
        const currentFilter = useEntryStore.getState().filterType
        if (currentFilter) {
          filterByType(currentFilter)
        } else {
          loadEntries()
        }
      }
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-700/50 bg-surface-900/50">
      <div className="flex-1 relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索条目... (⌘F)"
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-800 border border-surface-700 text-surface-100
            placeholder:text-surface-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
        />
      </div>

      <div className="relative">
        <Button variant="ghost" size="sm" onClick={() => setShowFilter(!showFilter)} className="relative">
          <Filter size={16} />
          {filterType && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary-500" />}
        </Button>
        {showFilter && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowFilter(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-surface-800 border border-surface-700 rounded-lg shadow-xl py-1">
              <button
                onClick={() => { filterByType(null); setShowFilter(false) }}
                className={`w-full text-left px-3 py-2 text-sm ${!filterType ? 'text-primary-400 bg-primary-600/10' : 'text-surface-300 hover:bg-surface-700'}`}
              >
                全部
              </button>
              {CATEGORY_TEMPLATES.map((t) => (
                <button
                  key={t.type}
                  onClick={() => { filterByType(t.type); setShowFilter(false) }}
                  className={`w-full text-left px-3 py-2 text-sm ${filterType === t.type ? 'text-primary-400 bg-primary-600/10' : 'text-surface-300 hover:bg-surface-700'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <Button size="sm" onClick={onAdd}>
        <Plus size={16} />
        新增
      </Button>
    </div>
  )
}
