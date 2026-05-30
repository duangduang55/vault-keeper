import { useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useThemeStore } from '../../stores/themeStore'

interface AppLogoProps {
  size?: number
  className?: string
}

export function AppLogo({ size = 32, className = '' }: AppLogoProps) {
  const [iconUrl, setIconUrl] = useState<string | null>(null)
  const theme = useThemeStore((s) => s.theme)

  useEffect(() => {
    const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    let cleanup: string | null = null
    invoke<number[]>('get_app_icon', { dark: isDark })
      .then((data) => {
        const blob = new Blob([new Uint8Array(data)], { type: 'image/png' })
        const url = URL.createObjectURL(blob)
        cleanup = url
        setIconUrl(url)
      })
      .catch(() => {})
    return () => { if (cleanup) URL.revokeObjectURL(cleanup) }
  }, [theme])

  return (
    <div
      className={`inline-flex items-center justify-center rounded-[14px] overflow-hidden shrink-0 ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
    >
      {iconUrl ? (
        <img src={iconUrl} alt="清密" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-primary-500/10 flex items-center justify-center">
          <span className="text-xs font-semibold text-surface-400">清</span>
        </div>
      )}
    </div>
  )
}
