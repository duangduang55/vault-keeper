import { Modal } from './Modal'
import { Button } from './Button'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  loading?: boolean
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmText = '确认删除', loading }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-surface-300 text-sm mb-5">{message}</p>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose} disabled={loading}>取消</Button>
        <Button variant="danger" onClick={onConfirm} disabled={loading}>
          {loading ? '处理中...' : confirmText}
        </Button>
      </div>
    </Modal>
  )
}
