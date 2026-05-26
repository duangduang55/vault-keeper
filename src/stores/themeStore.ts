import { create } from 'zustand'
import { invoke } from '@tauri-apps/api/core'

type Theme = 'auto' | 'dark' | 'light'

interface ThemeState {
  theme: Theme
  /** 实际生效的主题（auto 模式下跟随系统） */
  resolved: 'dark' | 'light'
  loaded: boolean
  setTheme: (theme: Theme) => Promise<void>
  loadTheme: () => Promise<void>
}

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: 'dark' | 'light') {
  if (resolved === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

const STORAGE_KEY = 'vault-keeper-theme'

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'dark',
  resolved: 'dark',
  loaded: false,

  loadTheme: async () => {
    // 1. 优先从数据库加载（仅已解锁时可用）
    try {
      const config = await invoke<{ theme: string }>('get_app_config')
      const theme = (config.theme || 'dark') as Theme
      const resolved = theme === 'auto' ? getSystemTheme() : (theme as 'dark' | 'light')
      applyTheme(resolved)
      localStorage.setItem(STORAGE_KEY, theme)
      set({ theme, resolved, loaded: true })
      return
    } catch {
      // 数据库不可用（未解锁）
    }

    // 2. 回退到 localStorage
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
    const theme = saved || 'dark'
    const resolved = theme === 'auto' ? getSystemTheme() : (theme as 'dark' | 'light')
    applyTheme(resolved)
    set({ theme, resolved, loaded: true })
  },

  setTheme: async (theme: Theme) => {
    const resolved = theme === 'auto' ? getSystemTheme() : (theme as 'dark' | 'light')
    applyTheme(resolved)
    set({ theme, resolved })
    localStorage.setItem(STORAGE_KEY, theme)

    try {
      await invoke('update_app_config', { theme })
    } catch {
      // 静默失败，下次解锁后会同步
    }
  },
}))

// 监听系统主题变化（auto 模式下自动切换）
let mediaQuery: MediaQueryList | null = null

export function watchSystemTheme() {
  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => {
    const { theme } = useThemeStore.getState()
    if (theme === 'auto') {
      const resolved = getSystemTheme()
      applyTheme(resolved)
      useThemeStore.setState({ resolved })
    }
  }
  mediaQuery.addEventListener('change', handler)
  return () => mediaQuery?.removeEventListener('change', handler)
}
