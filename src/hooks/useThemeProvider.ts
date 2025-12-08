import { useEffect, useCallback } from 'react'
import { lightTheme, darkTheme } from '@/lib/theme'

/**
 * Hook to apply semantic color tokens to the document root
 * This hook works WITHOUT depending on useTheme() to avoid circular dependencies
 * It watches for theme changes via DOM class mutations
 */
export function useThemeProvider() {
  const applyTheme = useCallback(() => {
    const root = document.documentElement
    
    // Detect if dark mode is active by checking html class
    const isDark = root.classList.contains('dark')
    const themeVariables = isDark ? darkTheme : lightTheme

    // Apply CSS variables to root element
    Object.entries(themeVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    // Set data attribute for CSS selectors
    root.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [])

  // Apply theme on initial mount
  useEffect(() => {
    applyTheme()
  }, [applyTheme])

  // Watch for theme class changes and reapply
  useEffect(() => {
    const observer = new MutationObserver(() => {
      applyTheme()
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [applyTheme])

  return { 
    applyTheme,
    isDark: document.documentElement.classList.contains('dark'),
  }
}
