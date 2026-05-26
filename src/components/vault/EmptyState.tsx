import { Plus, Shield } from 'lucide-react'
import { Button } from '../common/Button'

interface EmptyStateProps {
  title: string
  description: string
  onAction?: () => void
}

export function EmptyState({ title, description, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="w-14 h-14 rounded-[14px] bg-surface-800 flex items-center justify-center mb-4">
        <Shield size={24} className="text-surface-500" />
      </div>
      <h3 className="text-[15px] font-semibold text-surface-300 mb-1">{title}</h3>
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
