import { useState } from 'react'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { toast } from '../common/Toast'

interface PasswordGeneratorProps {
  open: boolean
  onClose: () => void
  onGenerate: (password: string) => void
}

function evaluateStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (pw.length >= 16) score++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++
  if (/\d/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++

  const label = score < 3 ? '弱' : score < 5 ? '中' : '强'
  const color = score < 3 ? 'bg-red-500' : score < 5 ? 'bg-yellow-500' : 'bg-green-500'
  return { score, label, color }
}

const DEFAULT_LENGTH = 16

export function PasswordGenerator({ open, onClose, onGenerate }: PasswordGeneratorProps) {
  const [length, setLength] = useState(DEFAULT_LENGTH)
  const [useUpper, setUseUpper] = useState(true)
  const [useLower, setUseLower] = useState(true)
  const [useDigits, setUseDigits] = useState(true)
  const [useSymbols, setUseSymbols] = useState(true)
  const [password, setPassword] = useState('')

  const generate = () => {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    const lower = 'abcdefghijklmnopqrstuvwxyz'
    const digits = '0123456789'
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?'

    let chars = ''
    if (useUpper) chars += upper
    if (useLower) chars += lower
    if (useDigits) chars += digits
    if (useSymbols) chars += symbols

    if (!chars) {
      toast('至少选择一种字符类型', 'warning')
      return
    }

    const array = new Uint32Array(length)
    crypto.getRandomValues(array)
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length]
    }
    setPassword(result)
  }

  const handleUse = () => {
    if (!password) return
    onGenerate(password)
    toast('密码已填入', 'success')
  }

  const handleCopy = () => {
    if (!password) return
    navigator.clipboard.writeText(password).then(() => toast('已复制到剪贴板', 'success'))
  }

  const strength = evaluateStrength(password)

  return (
    <Modal open={open} onClose={onClose} title="密码生成器" size="sm">
      <div className="space-y-4">
        {password && (
          <div className="bg-surface-900 border border-surface-700 rounded-lg p-3">
            <p className="text-lg font-mono text-center text-surface-100 break-all select-all">{password}</p>
            <div className="mt-2 flex gap-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className={`h-1 flex-1 rounded-full ${i < strength.score ? strength.color : 'bg-surface-700'}`} />
              ))}
            </div>
            <p className="text-xs text-surface-500 text-center mt-1">{strength.label} ({length} 位)</p>
          </div>
        )}

        <div>
          <label className="text-sm text-surface-300 mb-2 block">长度: {length}</label>
          <input
            type="range"
            min={8}
            max={64}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="w-full accent-primary-500"
          />
          <div className="flex justify-between text-[11px] text-surface-500">
            <span>8</span><span>64</span>
          </div>
        </div>

        <div className="space-y-2">
          {[
            { label: '大写字母 A-Z', value: useUpper, set: setUseUpper },
            { label: '小写字母 a-z', value: useLower, set: setUseLower },
            { label: '数字 0-9', value: useDigits, set: setUseDigits },
            { label: '符号 !@#$%', value: useSymbols, set: setUseSymbols },
          ].map(({ label, value, set }) => (
            <label key={label} className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={value} onChange={() => set(!value)} className="rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500" />
              <span className="text-sm text-surface-300">{label}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-between">
          <Button variant="secondary" onClick={generate}>生成</Button>
          <div className="flex gap-2">
            {password && (
              <>
                <Button variant="ghost" onClick={handleCopy}>复制</Button>
                <Button onClick={handleUse}>使用</Button>
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
