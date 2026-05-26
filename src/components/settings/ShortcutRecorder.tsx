import { useState, useRef, useCallback, type KeyboardEvent } from 'react'

interface ShortcutRecorderProps {
  value: string
  onChange: (value: string) => void
}

const MOD_SYMBOLS: Record<string, string> = {
  'CmdOrCtrl': '⌘',
  'Shift': '⇧',
  'Alt': '⌥',
}

function formatShortcut(shortcut: string): string {
  return shortcut.split('+').map(p => MOD_SYMBOLS[p] || p).join('')
}

const MODIFIER_KEYS = new Set(['Meta', 'Control', 'Shift', 'Alt', 'Fn', 'CapsLock', 'Tab', 'Escape'])

export function ShortcutRecorder({ value, onChange }: ShortcutRecorderProps) {
  const [recording, setRecording] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (!recording) return
    e.preventDefault()
    e.stopPropagation()

    const { metaKey, ctrlKey, shiftKey, altKey, key } = e

    if (MODIFIER_KEYS.has(key)) return

    const parts: string[] = []

    if (metaKey || ctrlKey) {
      parts.push('CmdOrCtrl')
    }
    if (shiftKey) {
      parts.push('Shift')
    }
    if (altKey) {
      parts.push('Alt')
    }

    const mainKey = key.length === 1 ? key.toUpperCase() : key
    parts.push(mainKey)

    onChange(parts.join('+'))
    setRecording(false)
  }, [recording, onChange])

  const handleKeyUp = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (!recording) return
    e.preventDefault()
    e.stopPropagation()
  }, [recording])

  const handleFocus = useCallback(() => {
    setRecording(true)
    onChange('')
  }, [onChange])

  const handleBlur = useCallback(() => {
    setRecording(false)
  }, [])

  return (
    <input
      ref={inputRef}
      value={recording ? '' : formatShortcut(value)}
      placeholder={recording ? '按下快捷键...' : value || '点击后按键盘'}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      readOnly
      className={`flex-1 bg-surface-800 border rounded-[10px] px-3 py-2 text-sm text-surface-200 placeholder-surface-500 focus:outline-none focus:ring-2 font-mono cursor-pointer transition-all duration-200
        ${recording ? 'border-primary-500 ring-1 ring-primary-500' : 'border-surface-700 hover:border-surface-500 focus:ring-primary-500/50'}`}
    />
  )
}
