/**
 * Hook to access semantic color tokens as computed values
 * 
 * Usage:
 * const tokens = useSemanticTokens()
 * return <div style={{ background: tokens.surface.primary }}>...</div>
 * 
 * Or with CSS variables directly:
 * return <div style={{ background: 'var(--color-surface-primary)' }}>...</div>
 */
import { useEffect, useState } from 'react'

export interface SemanticTokenValues {
  surface: Record<string, string>
  text: Record<string, string>
  brand: Record<string, string>
  status: Record<string, string>
  border: Record<string, string>
  focus: string
  shadow: string
  overlay: string
}

export function useSemanticTokens(): SemanticTokenValues {
  const [tokens, setTokens] = useState<SemanticTokenValues>(() => getComputedTokens())

  useEffect(() => {
    // Recompute tokens when theme changes
    const handleThemeChange = () => {
      setTokens(getComputedTokens())
    }

    window.addEventListener('colorschemechange', handleThemeChange)
    const observer = new MutationObserver(handleThemeChange)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => {
      window.removeEventListener('colorschemechange', handleThemeChange)
      observer.disconnect()
    }
  }, [])

  return tokens
}

/**
 * Get computed values of semantic tokens from CSS variables
 */
function getComputedTokens(): SemanticTokenValues {
  const style = getComputedStyle(document.documentElement)

  const getValue = (varName: string) =>
    style.getPropertyValue(varName).trim()

  return {
    surface: {
      primary: getValue('--color-surface-primary'),
      secondary: getValue('--color-surface-secondary'),
      tertiary: getValue('--color-surface-tertiary'),
      interactive: getValue('--color-surface-interactive'),
      interactive_hover: getValue('--color-surface-interactive-hover'),
    },
    text: {
      primary: getValue('--color-text-primary'),
      secondary: getValue('--color-text-secondary'),
      tertiary: getValue('--color-text-tertiary'),
      inverse: getValue('--color-text-inverse'),
      disabled: getValue('--color-text-disabled'),
    },
    brand: {
      primary: getValue('--color-brand-primary'),
      primary_hover: getValue('--color-brand-primary-hover'),
      primary_active: getValue('--color-brand-primary-active'),
    },
    status: {
      success: getValue('--color-status-success'),
      success_light: getValue('--color-status-success-light'),
      warning: getValue('--color-status-warning'),
      warning_light: getValue('--color-status-warning-light'),
      error: getValue('--color-status-error'),
      error_light: getValue('--color-status-error-light'),
      info: getValue('--color-status-info'),
      info_light: getValue('--color-status-info-light'),
    },
    border: {
      default: getValue('--color-border-default'),
      light: getValue('--color-border-light'),
      strong: getValue('--color-border-strong'),
    },
    focus: getValue('--color-focus'),
    shadow: getValue('--color-shadow'),
    overlay: getValue('--color-overlay'),
  }
}

/**
 * Get a semantic token value directly (synchronous)
 * 
 * Usage: const bgColor = getSemanticToken('--color-surface-primary')
 */
export function getSemanticToken(varName: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
}

/**
 * Helper to create inline styles with semantic tokens
 * 
 * Usage:
 * const styles = createSemanticStyles({
 *   background: '--color-surface-primary',
 *   color: '--color-text-primary',
 * })
 */
export function createSemanticStyles(tokenMap: Record<string, string>): Record<string, string> {
  const styles: Record<string, string> = {}
  Object.entries(tokenMap).forEach(([cssProperty, cssVariable]) => {
    styles[cssProperty] = `var(${cssVariable})`
  })
  return styles
}
