import { useCallback, useEffect, useState } from 'react'

export type ThemeMode = 'light' | 'dark'
const KEY = 'kompeten-theme'

function read(): ThemeMode {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

function apply(mode: ThemeMode) {
  document.documentElement.classList.toggle('dark', mode === 'dark')
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(read)

  useEffect(() => {
    apply(mode)
  }, [mode])

  const setMode = useCallback((next: ThemeMode) => {
    try {
      localStorage.setItem(KEY, next)
    } catch {}
    setModeState(next)
    apply(next)
  }, [])

  const toggle = useCallback(() => {
    setMode(read() === 'dark' ? 'light' : 'dark')
  }, [setMode])

  return { mode, setMode, toggle }
}
