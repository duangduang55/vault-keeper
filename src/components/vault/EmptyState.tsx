import { Plus } from 'lucide-react'
import { Button } from '../common/Button'

interface EmptyStateProps {
  title: string
  description: string
  onAction?: () => void
}

/** 与图标风格一致的"保险柜门"环形 SVG */
function VaultRing() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      className="vault-pulse"
    >
      <rect
        x="2" y="2" width="60" height="60" rx="13"
        fill="currentColor"
        className="text-surface-800"
      />
      <circle
        cx="41" cy="32" r="11"
        fill="currentColor"
        className="text-surface-500"
      />
      <circle
        cx="41" cy="32" r="12.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        className="text-surface-800"
      />
    </svg>
  )
}

export function EmptyState({ title, description, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div className="mb-5 opacity-80">
        <VaultRing />
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
