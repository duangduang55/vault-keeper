import { useEffect } from 'react'

export function useDebounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T {
  useEffect(() => {
    const timer = setTimeout(() => fn, delay)
    return () => clearTimeout(timer)
  }, [fn, delay])
  return fn
}
