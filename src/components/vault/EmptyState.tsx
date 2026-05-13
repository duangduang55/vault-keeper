import { Plus } from 'lucide-react'
import { Button } from '../common/Button'

interface EmptyStateProps {
  title: string
  description: string
  onAction?: () => void
}

export function EmptyState({ title, description, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-surface-300 mb-1">{title}</h3>
      <p className="text-sm text-surface-500 mb-5 max-w-xs">{description}</p>
      {onAction && (
        <Button onClick={onAction}>
          <Plus size={16} />
          添加条目
        </Button>
      )}
    </div>
  )
}
