import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { copyToClipboard } from '../../lib/clipboard'
import { toast } from './Toast'

interface CopyButtonProps {
  entryId: string
  fieldKey: string
  value?: string
}

export function CopyButton({ entryId, fieldKey }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await copyToClipboard(entryId, fieldKey)
      setCopied(true)
      toast('已复制到剪贴板，30秒后自动清除', 'success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast('复制失败', 'error')
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg text-surface-400 hover:text-surface-100 hover:bg-surface-700 transition-all duration-200 active:scale-90"
      title="复制"
    >
      {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
    </button>
  )
}
