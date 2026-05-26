import { useEntryStore } from '../../stores/entryStore'
import { EntryList } from './EntryList'
import { EntryDetail } from './EntryDetail'
import { EntryForm } from '../forms/EntryForm'
import { EmptyState } from './EmptyState'
import { Spinner } from '../common/Spinner'
import type { Entry } from '../../types/entry'

interface VaultViewProps {
  showForm: boolean
  editingEntry: Entry | null
  onOpenForm: (open: boolean) => void
  onEditEntry: (entry: Entry) => void
  onFormClose: () => void
}

export function VaultView({ showForm, editingEntry, onOpenForm, onEditEntry, onFormClose }: VaultViewProps) {
  const { entries, isLoading, selectedEntry, selectEntry, filterType } = useEntryStore()

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 overflow-y-auto p-4 ${selectedEntry ? 'hidden lg:block' : ''}`}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Spinner size={24} />
            </div>
          ) : entries.length === 0 ? (
            <EmptyState
              title={filterType ? '该分类暂无条目' : '保险箱是空的'}
              description={filterType ? '切换分类或添加新条目' : '点击上方 + 按钮添加第一条关键信息'}
              onAction={() => onOpenForm(true)}
            />
          ) : (
            <EntryList entries={entries} onSelect={selectEntry} selectedId={selectedEntry?.id ?? null} />
          )}
        </div>

        {selectedEntry && (
          <div className="w-full lg:w-96 border-l border-surface-800 overflow-y-auto bg-surface-950">
            <EntryDetail entry={selectedEntry} onEdit={() => onEditEntry(selectedEntry)} />
          </div>
        )}
      </div>

      {showForm && (
        <EntryForm
          editEntry={editingEntry}
          onClose={onFormClose}
        />
      )}
    </div>
  )
}
