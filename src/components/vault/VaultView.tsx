import { useState } from 'react'
import { useEntryStore } from '../../stores/entryStore'
import { SearchBar } from './SearchBar'
import { EntryList } from './EntryList'
import { EntryDetail } from './EntryDetail'
import { EntryForm } from '../forms/EntryForm'
import { EmptyState } from './EmptyState'
import { Spinner } from '../common/Spinner'

export function VaultView() {
  const { entries, isLoading, selectedEntry, selectEntry, filterType } = useEntryStore()
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<typeof selectedEntry>(null)

  const handleEdit = (entry: NonNullable<typeof selectedEntry>) => {
    setEditingEntry(entry)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingEntry(null)
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <SearchBar onAdd={() => setShowForm(true)} />

      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 overflow-y-auto p-4 ${selectedEntry ? 'hidden lg:block' : ''}`}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Spinner size={32} />
            </div>
          ) : entries.length === 0 ? (
            <EmptyState
              title={filterType ? '该分类暂无条目' : '保险箱是空的'}
              description={filterType ? '切换分类或添加新条目' : '点击上方 + 按钮添加第一条关键信息'}
              onAction={() => setShowForm(true)}
            />
          ) : (
            <EntryList entries={entries} onSelect={selectEntry} selectedId={selectedEntry?.id ?? null} />
          )}
        </div>

        {selectedEntry && (
          <div className="w-full lg:w-96 border-l border-surface-700/50 overflow-y-auto bg-surface-900/50">
            <EntryDetail entry={selectedEntry} onEdit={() => handleEdit(selectedEntry)} />
          </div>
        )}
      </div>

      {showForm && (
        <EntryForm
          editEntry={editingEntry}
          onClose={handleFormClose}
        />
      )}
    </div>
  )
}
