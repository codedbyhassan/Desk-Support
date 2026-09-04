import { useCallback, useEffect, useState } from 'react'
import { lightTheme, darkTheme } from '@/lib/theme'

/**
 * Applies the semantic theme tokens to the document root.
 * The active theme is read from the root's `dark` class so this hook
 * stays independent from the ThemeContext implementation.
 */
export function useThemeProvider() {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  )

  const applyTheme = useCallback(() => {
    const root = document.documentElement
    const dark = root.classList.contains('dark')
    const themeVariables = dark ? darkTheme : lightTheme

    Object.entries(themeVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })
    root.setAttribute('data-theme', dark ? 'dark' : 'light')
    setIsDark(dark)
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    applyTheme()
  }, [applyTheme])

  useEffect(() => {
    if (typeof document === 'undefined') return

    const observer = new MutationObserver(applyTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [applyTheme])

  return { applyTheme, isDark }
}
