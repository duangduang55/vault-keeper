import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, X } from 'lucide-react'

type ToastType = 'success' | 'error' | 'warning'

interface ToastData {
  id: number
  message: string
  type: ToastType
}

let toastId = 0
let addToastFn: ((t: ToastData) => void) | null = null

export function toast(message: string, type: ToastType = 'success') {
  addToastFn?.({ id: ++toastId, message, type })
}

const icons = {
  success: { icon: CheckCircle, color: 'text-green-400' },
  error: { icon: XCircle, color: 'text-red-400' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400' },
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  useEffect(() => {
    addToastFn = (t) => {
      setToasts((prev) => [...prev, t])
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 3000)
    }
    return () => { addToastFn = null }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2">
      {toasts.map((t) => {
        const { icon: Icon, color } = icons[t.type]
        return (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border border-surface-700 bg-surface-800 min-w-[260px] animate-slide-up`}
          >
            <Icon size={18} className={color} />
            <span className="text-sm text-surface-200 flex-1">{t.message}</span>
            <button onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} className="text-surface-500 hover:text-surface-300">
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
