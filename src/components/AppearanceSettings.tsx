/**
 * Appearance Settings Component - Redesigned
 * 
 * Structured exactly like theme.ts with:
 * - Semantic tokens (surface, text, brand, status, border)
 * - Light/Dark mode customization
 * - Live preview and real-time application
 * - Direct CSS variable mapping
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useTheme } from '@/context/ThemeContext'
import { useToast } from '@/hooks/use-toast'
import { ColorSchemeSelector } from '@/components/ColorSchemeSelector'
import { 
  Palette, 
  Moon, 
  Sun, 
  RotateCcw, 
  Download,
  Copy,
  Check
} from 'lucide-react'

// Import theme definitions
import { lightTheme, darkTheme } from '@/lib/theme'

interface TokenValue {
  key: string
  cssVar: string
  label: string
  category: 'surface' | 'text' | 'brand' | 'status' | 'border' | 'other'
}

// Comprehensive color palettes that affect entire layout
const COLOR_PALETTES = {
  light: {
    'Light Pure': {
      '--color-surface-primary': 'rgb(255, 255, 255)',
      '--color-surface-secondary': 'rgb(248, 250, 252)',
      '--color-surface-tertiary': 'rgb(241, 245, 249)',
      '--color-surface-interactive': 'rgb(229, 231, 235)',
      '--color-surface-interactive-hover': 'rgb(209, 213, 219)',
      '--color-text-primary': 'rgb(15, 23, 42)',
      '--color-text-secondary': 'rgb(71, 85, 105)',
      '--color-text-tertiary': 'rgb(148, 163, 184)',
      '--color-text-inverse': 'rgb(255, 255, 255)',
      '--color-text-disabled': 'rgb(203, 213, 225)',
      '--color-brand-primary': 'rgb(37, 99, 235)',
      '--color-brand-primary-hover': 'rgb(29, 78, 216)',
      '--color-brand-primary-active': 'rgb(23, 37, 84)',
      '--color-status-success': 'rgb(5, 150, 105)',
      '--color-status-success-light': 'rgb(236, 253, 245)',
      '--color-status-warning': 'rgb(202, 138, 4)',
      '--color-status-warning-light': 'rgb(254, 252, 232)',
      '--color-status-error': 'rgb(220, 38, 38)',
      '--color-status-error-light': 'rgb(254, 242, 242)',
      '--color-status-info': 'rgb(37, 99, 235)',
      '--color-status-info-light': 'rgb(239, 246, 255)',
      '--color-border-default': 'rgb(226, 232, 240)',
      '--color-border-light': 'rgb(241, 245, 249)',
      '--color-border-strong': 'rgb(148, 163, 184)',
      '--color-focus': 'rgb(37, 99, 235)',
      '--color-shadow': 'rgba(0, 0, 0, 0.1)',
      '--color-overlay': 'rgba(0, 0, 0, 0.5)',
    },
    'Light Warm': {
      '--color-surface-primary': 'rgb(255, 255, 255)',
      '--color-surface-secondary': 'rgb(254, 252, 251)',
      '--color-surface-tertiary': 'rgb(254, 249, 246)',
      '--color-surface-interactive': 'rgb(253, 245, 239)',
      '--color-surface-interactive-hover': 'rgb(252, 240, 230)',
      '--color-text-primary': 'rgb(30, 24, 20)',
      '--color-text-secondary': 'rgb(87, 78, 70)',
      '--color-text-tertiary': 'rgb(156, 140, 128)',
      '--color-text-inverse': 'rgb(255, 255, 255)',
      '--color-text-disabled': 'rgb(208, 194, 180)',
      '--color-brand-primary': 'rgb(217, 70, 39)',
      '--color-brand-primary-hover': 'rgb(180, 50, 20)',
      '--color-brand-primary-active': 'rgb(120, 30, 10)',
      '--color-status-success': 'rgb(34, 197, 94)',
      '--color-status-success-light': 'rgb(240, 253, 244)',
      '--color-status-warning': 'rgb(251, 191, 36)',
      '--color-status-warning-light': 'rgb(254, 252, 232)',
      '--color-status-error': 'rgb(239, 68, 68)',
      '--color-status-error-light': 'rgb(254, 242, 242)',
      '--color-status-info': 'rgb(37, 99, 235)',
      '--color-status-info-light': 'rgb(239, 246, 255)',
      '--color-border-default': 'rgb(240, 220, 200)',
      '--color-border-light': 'rgb(250, 240, 230)',
      '--color-border-strong': 'rgb(200, 160, 130)',
      '--color-focus': 'rgb(217, 70, 39)',
      '--color-shadow': 'rgba(217, 70, 39, 0.08)',
      '--color-overlay': 'rgba(0, 0, 0, 0.5)',
    },
    'Light Cool': {
      '--color-surface-primary': 'rgb(255, 255, 255)',
      '--color-surface-secondary': 'rgb(240, 249, 255)',
      '--color-surface-tertiary': 'rgb(224, 242, 254)',
      '--color-surface-interactive': 'rgb(206, 235, 252)',
      '--color-surface-interactive-hover': 'rgb(186, 230, 253)',
      '--color-text-primary': 'rgb(7, 32, 71)',
      '--color-text-secondary': 'rgb(30, 64, 120)',
      '--color-text-tertiary': 'rgb(100, 130, 180)',
      '--color-text-inverse': 'rgb(255, 255, 255)',
      '--color-text-disabled': 'rgb(175, 185, 202)',
      '--color-brand-primary': 'rgb(59, 130, 246)',
      '--color-brand-primary-hover': 'rgb(37, 99, 235)',
      '--color-brand-primary-active': 'rgb(29, 78, 216)',
      '--color-status-success': 'rgb(34, 197, 94)',
      '--color-status-success-light': 'rgb(240, 253, 244)',
      '--color-status-warning': 'rgb(251, 191, 36)',
      '--color-status-warning-light': 'rgb(254, 252, 232)',
      '--color-status-error': 'rgb(239, 68, 68)',
      '--color-status-error-light': 'rgb(254, 242, 242)',
      '--color-status-info': 'rgb(59, 130, 246)',
      '--color-status-info-light': 'rgb(224, 242, 254)',
      '--color-border-default': 'rgb(190, 224, 245)',
      '--color-border-light': 'rgb(224, 242, 254)',
      '--color-border-strong': 'rgb(120, 180, 230)',
      '--color-focus': 'rgb(59, 130, 246)',
      '--color-shadow': 'rgba(59, 130, 246, 0.08)',
      '--color-overlay': 'rgba(0, 0, 0, 0.5)',
    },
  },
  dark: {
    'Dark Premium': {
      '--color-surface-primary': 'rgb(13, 17, 28)',
      '--color-surface-secondary': 'rgb(21, 26, 42)',
      '--color-surface-tertiary': 'rgb(31, 37, 56)',
      '--color-surface-interactive': 'rgb(45, 51, 73)',
      '--color-surface-interactive-hover': 'rgb(56, 63, 88)',
      '--color-text-primary': 'rgb(243, 244, 246)',
      '--color-text-secondary': 'rgb(209, 213, 219)',
      '--color-text-tertiary': 'rgb(156, 163, 175)',
      '--color-text-inverse': 'rgb(13, 17, 28)',
      '--color-text-disabled': 'rgb(107, 114, 128)',
      '--color-brand-primary': 'rgb(96, 165, 250)',
      '--color-brand-primary-hover': 'rgb(147, 197, 253)',
      '--color-brand-primary-active': 'rgb(59, 130, 246)',
      '--color-status-success': 'rgb(34, 197, 94)',
      '--color-status-success-light': 'rgb(20, 83, 45)',
      '--color-status-warning': 'rgb(250, 204, 21)',
      '--color-status-warning-light': 'rgb(78, 65, 20)',
      '--color-status-error': 'rgb(248, 113, 113)',
      '--color-status-error-light': 'rgb(127, 29, 29)',
      '--color-status-info': 'rgb(96, 165, 250)',
      '--color-status-info-light': 'rgb(30, 58, 138)',
      '--color-border-default': 'rgb(55, 65, 81)',
      '--color-border-light': 'rgb(45, 51, 73)',
      '--color-border-strong': 'rgb(75, 85, 99)',
      '--color-focus': 'rgb(96, 165, 250)',
      '--color-shadow': 'rgba(0, 0, 0, 0.5)',
      '--color-overlay': 'rgba(0, 0, 0, 0.8)',
    },
    'Dark Warm': {
      '--color-surface-primary': 'rgb(20, 15, 12)',
      '--color-surface-secondary': 'rgb(30, 22, 18)',
      '--color-surface-tertiary': 'rgb(45, 33, 28)',
      '--color-surface-interactive': 'rgb(60, 45, 38)',
      '--color-surface-interactive-hover': 'rgb(75, 55, 48)',
      '--color-text-primary': 'rgb(250, 248, 245)',
      '--color-text-secondary': 'rgb(225, 210, 195)',
      '--color-text-tertiary': 'rgb(180, 160, 140)',
      '--color-text-inverse': 'rgb(20, 15, 12)',
      '--color-text-disabled': 'rgb(120, 100, 80)',
      '--color-brand-primary': 'rgb(255, 140, 80)',
      '--color-brand-primary-hover': 'rgb(255, 170, 120)',
      '--color-brand-primary-active': 'rgb(220, 100, 40)',
      '--color-status-success': 'rgb(52, 211, 153)',
      '--color-status-success-light': 'rgb(16, 185, 129)',
      '--color-status-warning': 'rgb(251, 191, 36)',
      '--color-status-warning-light': 'rgb(217, 119, 6)',
      '--color-status-error': 'rgb(248, 113, 113)',
      '--color-status-error-light': 'rgb(185, 28, 28)',
      '--color-status-info': 'rgb(255, 140, 80)',
      '--color-status-info-light': 'rgb(124, 58, 30)',
      '--color-border-default': 'rgb(80, 60, 50)',
      '--color-border-light': 'rgb(60, 45, 38)',
      '--color-border-strong': 'rgb(110, 80, 65)',
      '--color-focus': 'rgb(255, 140, 80)',
      '--color-shadow': 'rgba(0, 0, 0, 0.6)',
      '--color-overlay': 'rgba(0, 0, 0, 0.85)',
    },
    'Dark Cool': {
      '--color-surface-primary': 'rgb(12, 25, 45)',
      '--color-surface-secondary': 'rgb(18, 35, 60)',
      '--color-surface-tertiary': 'rgb(28, 50, 80)',
      '--color-surface-interactive': 'rgb(40, 65, 100)',
      '--color-surface-interactive-hover': 'rgb(50, 80, 120)',
      '--color-text-primary': 'rgb(240, 248, 255)',
      '--color-text-secondary': 'rgb(200, 225, 255)',
      '--color-text-tertiary': 'rgb(150, 180, 220)',
      '--color-text-inverse': 'rgb(12, 25, 45)',
      '--color-text-disabled': 'rgb(90, 130, 170)',
      '--color-brand-primary': 'rgb(100, 200, 255)',
      '--color-brand-primary-hover': 'rgb(150, 220, 255)',
      '--color-brand-primary-active': 'rgb(70, 160, 220)',
      '--color-status-success': 'rgb(34, 197, 94)',
      '--color-status-success-light': 'rgb(16, 185, 129)',
      '--color-status-warning': 'rgb(251, 191, 36)',
      '--color-status-warning-light': 'rgb(217, 119, 6)',
      '--color-status-error': 'rgb(248, 113, 113)',
      '--color-status-error-light': 'rgb(185, 28, 28)',
      '--color-status-info': 'rgb(100, 200, 255)',
      '--color-status-info-light': 'rgb(30, 90, 150)',
      '--color-border-default': 'rgb(60, 100, 150)',
      '--color-border-light': 'rgb(40, 65, 100)',
      '--color-border-strong': 'rgb(90, 140, 190)',
      '--color-focus': 'rgb(100, 200, 255)',
      '--color-shadow': 'rgba(0, 0, 0, 0.7)',
      '--color-overlay': 'rgba(0, 0, 0, 0.9)',
    },
  },
}

const SEMANTIC_TOKENS: TokenValue[] = [
  // Surface colors
  { key: 'surface-primary', cssVar: '--color-surface-primary', label: 'Primary Surface', category: 'surface' },
  { key: 'surface-secondary', cssVar: '--color-surface-secondary', label: 'Secondary Surface', category: 'surface' },
  { key: 'surface-tertiary', cssVar: '--color-surface-tertiary', label: 'Tertiary Surface', category: 'surface' },
  { key: 'surface-interactive', cssVar: '--color-surface-interactive', label: 'Interactive Surface', category: 'surface' },
  { key: 'surface-interactive-hover', cssVar: '--color-surface-interactive-hover', label: 'Interactive Hover', category: 'surface' },

  // Text colors
  { key: 'text-primary', cssVar: '--color-text-primary', label: 'Primary Text', category: 'text' },
  { key: 'text-secondary', cssVar: '--color-text-secondary', label: 'Secondary Text', category: 'text' },
  { key: 'text-tertiary', cssVar: '--color-text-tertiary', label: 'Tertiary Text', category: 'text' },
  { key: 'text-inverse', cssVar: '--color-text-inverse', label: 'Inverse Text', category: 'text' },
  { key: 'text-disabled', cssVar: '--color-text-disabled', label: 'Disabled Text', category: 'text' },

  // Brand colors
  { key: 'brand-primary', cssVar: '--color-brand-primary', label: 'Primary Brand', category: 'brand' },
  { key: 'brand-primary-hover', cssVar: '--color-brand-primary-hover', label: 'Brand Hover', category: 'brand' },
  { key: 'brand-primary-active', cssVar: '--color-brand-primary-active', label: 'Brand Active', category: 'brand' },

  // Status colors
  { key: 'status-success', cssVar: '--color-status-success', label: 'Success', category: 'status' },
  { key: 'status-success-light', cssVar: '--color-status-success-light', label: 'Success Light', category: 'status' },
  { key: 'status-warning', cssVar: '--color-status-warning', label: 'Warning', category: 'status' },
  { key: 'status-warning-light', cssVar: '--color-status-warning-light', label: 'Warning Light', category: 'status' },
  { key: 'status-error', cssVar: '--color-status-error', label: 'Error', category: 'status' },
  { key: 'status-error-light', cssVar: '--color-status-error-light', label: 'Error Light', category: 'status' },
  { key: 'status-info', cssVar: '--color-status-info', label: 'Info', category: 'status' },
  { key: 'status-info-light', cssVar: '--color-status-info-light', label: 'Info Light', category: 'status' },

  // Border colors
  { key: 'border-default', cssVar: '--color-border-default', label: 'Default Border', category: 'border' },
  { key: 'border-light', cssVar: '--color-border-light', label: 'Light Border', category: 'border' },
  { key: 'border-strong', cssVar: '--color-border-strong', label: 'Strong Border', category: 'border' },

  // Other colors
  { key: 'focus', cssVar: '--color-focus', label: 'Focus Ring', category: 'other' },
  { key: 'shadow', cssVar: '--color-shadow', label: 'Shadow', category: 'other' },
  { key: 'overlay', cssVar: '--color-overlay', label: 'Overlay', category: 'other' },
]

// Helper: Convert RGB to Hex
function rgbToHex(rgbString: string): string {
  const match = rgbString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (!match) return '#ffffff'
  const r = parseInt(match[1]).toString(16).padStart(2, '0')
  const g = parseInt(match[2]).toString(16).padStart(2, '0')
  const b = parseInt(match[3]).toString(16).padStart(2, '0')
  return `#${r}${g}${b}`
}

// Helper: Convert Hex to RGB
function hexToRgb(hexString: string): string {
  const hex = hexString.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return `rgb(${r}, ${g}, ${b})`
}

export function AppearanceSettings() {
  const { theme: currentTheme } = useTheme()
  const { toast } = useToast()

  // State for each theme
  const [lightConfig, setLightConfig] = useState<Record<string, string>>(lightTheme)
  const [darkConfig, setDarkConfig] = useState<Record<string, string>>(darkTheme)
  const [activeTab, setActiveTab] = useState('light')
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Get current config based on active tab
  const setCurrentConfig = activeTab === 'light' ? setLightConfig : setDarkConfig

  // Handle token change
  const handleTokenChange = (cssVar: string, value: string) => {
    setCurrentConfig(prev => ({
      ...prev,
      [cssVar]: value
    }))

    // Apply immediately to DOM for live preview
    if (activeTab === 'light' && currentTheme === 'light') {
      document.documentElement.style.setProperty(cssVar, value)
    } else if (activeTab === 'dark' && currentTheme === 'dark') {
      document.documentElement.style.setProperty(cssVar, value)
    }
  }

  // Apply light theme
  const applyLightTheme = () => {
    Object.entries(lightConfig).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value)
    })
    localStorage.setItem('light-theme-config', JSON.stringify(lightConfig))
    toast({ title: 'Light theme applied' })
  }

  // Apply dark theme
  const applyDarkTheme = () => {
    Object.entries(darkConfig).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value)
    })
    localStorage.setItem('dark-theme-config', JSON.stringify(darkConfig))
    toast({ title: 'Dark theme applied' })
  }

  // Reset to defaults
  const resetToDefaults = () => {
    if (activeTab === 'light') {
      setLightConfig(lightTheme)
      Object.entries(lightTheme).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value)
      })
    } else {
      setDarkConfig(darkTheme)
      Object.entries(darkTheme).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value)
      })
    }
    localStorage.removeItem(`${activeTab}-theme-config`)
    toast({ title: `${activeTab} theme reset to defaults` })
  }

  // Export theme
  const exportTheme = () => {
    const config = {
      light: lightConfig,
      dark: darkConfig,
      exportedAt: new Date().toISOString()
    }
    const dataStr = JSON.stringify(config, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `theme-config-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Theme exported successfully' })
  }

  // Apply preset palette
  const applyPreset = (paletteName: string) => {
    const paletteMode = activeTab === 'light' ? 'light' : 'dark'
    const palette = (COLOR_PALETTES as Record<string, Record<string, Record<string, string>>>)[paletteMode]?.[paletteName] as Record<string, string>
    if (!palette) return

    setCurrentConfig(palette)
    
    // Apply immediately to DOM
    Object.entries(palette).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value as string)
    })

    localStorage.setItem(`${paletteMode}-theme-config`, JSON.stringify(palette))
    toast({ title: `${paletteName} applied` })
  }

  // Copy token value
  const copyTokenValue = (value: string) => {
    navigator.clipboard.writeText(value)
    setCopiedToken(value)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  // Group tokens by category
  const groupedTokens = SEMANTIC_TOKENS.reduce((acc, token) => {
    if (!acc[token.category]) acc[token.category] = []
    acc[token.category].push(token)
    return acc
  }, {} as Record<string, TokenValue[]>)

  const categoryLabels: Record<string, string> = {
    surface: 'Surface Colors',
    text: 'Text Colors',
    brand: 'Brand Colors',
    status: 'Status Colors',
    border: 'Border Colors',
    other: 'Special Effects'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Palette className="h-6 w-6" />
        <div>
          <h2 className="text-2xl font-bold">Appearance Settings</h2>
          <p className="text-sm text-muted-foreground">
            Customize colors for light and dark modes using semantic tokens
          </p>
        </div>
      </div>

      {/* Color Scheme Selector */}
      <ColorSchemeSelector />

      {/* Theme Mode Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="light" className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            Light Mode
          </TabsTrigger>
          <TabsTrigger value="dark" className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            Dark Mode
          </TabsTrigger>
        </TabsList>

        {/* Light Mode Content */}
        <TabsContent value="light" className="space-y-6 mt-6">
          <Alert>
            <Sun className="h-4 w-4" />
            <AlertDescription>
              Customize colors for light mode. Changes are applied in real-time when viewing light theme.
            </AlertDescription>
          </Alert>

          {/* Preset Palettes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Presets</CardTitle>
              <CardDescription>Apply a complete light theme palette instantly</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
                {Object.keys(COLOR_PALETTES.light).map(paletteName => (
                  <Button
                    key={paletteName}
                    variant="outline"
                    onClick={() => applyPreset(paletteName)}
                    className="h-auto flex flex-col items-center gap-2 p-3"
                  >
                    <div className="w-full flex gap-1">
                      {Object.values(COLOR_PALETTES.light[paletteName as keyof typeof COLOR_PALETTES.light]).slice(0, 5).map((color, idx) => (
                        <div
                          key={idx}
                          className="flex-1 h-6 rounded-sm border"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span className="text-xs">{paletteName}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Color Tokens */}
          <div className="space-y-8">
            {Object.entries(groupedTokens).map(([category, tokens]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-lg">{categoryLabels[category]}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {tokens.map(token => {
                      const currentValue = lightConfig[token.cssVar] || ''
                      const hexValue = rgbToHex(currentValue)
                      return (
                        <div key={token.key} className="space-y-2">
                          <Label className="text-sm font-medium">{token.label}</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={hexValue}
                              onChange={(e) => handleTokenChange(token.cssVar, hexToRgb(e.target.value))}
                              className="w-12 h-10 cursor-pointer flex-shrink-0"
                            />
                            <Input
                              type="text"
                              value={currentValue}
                              onChange={(e) => handleTokenChange(token.cssVar, e.target.value)}
                              className="flex-1 text-xs font-mono"
                              placeholder="rgb(r, g, b)"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => copyTokenValue(currentValue)}
                              className="flex-shrink-0"
                            >
                              {copiedToken === currentValue ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={applyLightTheme} className="flex items-center gap-2">
              <Sun className="h-4 w-4" />
              Apply Light Theme
            </Button>
            <Button onClick={resetToDefaults} variant="outline" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset to Defaults
            </Button>
          </div>
        </TabsContent>

        {/* Dark Mode Content */}
        <TabsContent value="dark" className="space-y-6 mt-6">
          <Alert>
            <Moon className="h-4 w-4" />
            <AlertDescription>
              Customize colors for dark mode. Changes are applied in real-time when viewing dark theme.
            </AlertDescription>
          </Alert>

          {/* Preset Palettes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Presets</CardTitle>
              <CardDescription>Apply a complete dark theme palette instantly</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
                {Object.keys(COLOR_PALETTES.dark).map(paletteName => (
                  <Button
                    key={paletteName}
                    variant="outline"
                    onClick={() => applyPreset(paletteName)}
                    className="h-auto flex flex-col items-center gap-2 p-3"
                  >
                    <div className="w-full flex gap-1">
                      {Object.values(COLOR_PALETTES.dark[paletteName as keyof typeof COLOR_PALETTES.dark]).slice(0, 5).map((color, idx) => (
                        <div
                          key={idx}
                          className="flex-1 h-6 rounded-sm border"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span className="text-xs">{paletteName}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Color Tokens */}
          <div className="space-y-8">
            {Object.entries(groupedTokens).map(([category, tokens]) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="text-lg">{categoryLabels[category]}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {tokens.map(token => {
                      const currentValue = darkConfig[token.cssVar] || ''
                      const hexValue = rgbToHex(currentValue)
                      return (
                        <div key={token.key} className="space-y-2">
                          <Label className="text-sm font-medium">{token.label}</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={hexValue}
                              onChange={(e) => handleTokenChange(token.cssVar, hexToRgb(e.target.value))}
                              className="w-12 h-10 cursor-pointer flex-shrink-0"
                            />
                            <Input
                              type="text"
                              value={currentValue}
                              onChange={(e) => handleTokenChange(token.cssVar, e.target.value)}
                              className="flex-1 text-xs font-mono"
                              placeholder="rgb(r, g, b)"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => copyTokenValue(currentValue)}
                              className="flex-shrink-0"
                            >
                              {copiedToken === currentValue ? (
                                <Check className="h-4 w-4" />
                              ) : (
                                <Copy className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={applyDarkTheme} className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Apply Dark Theme
            </Button>
            <Button onClick={resetToDefaults} variant="outline" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset to Defaults
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Global Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Theme Management</CardTitle>
          <CardDescription>Export or import complete theme configurations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={exportTheme} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Theme
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Live Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="flex gap-2 flex-wrap">
              <Button>Primary Button</Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="destructive">Danger Button</Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="px-3 py-2 bg-[var(--color-status-success)] text-white rounded-md text-sm">Success</div>
              <div className="px-3 py-2 bg-[var(--color-status-warning)] text-white rounded-md text-sm">Warning</div>
              <div className="px-3 py-2 bg-[var(--color-status-error)] text-white rounded-md text-sm">Error</div>
              <div className="px-3 py-2 bg-[var(--color-status-info)] text-white rounded-md text-sm">Info</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
