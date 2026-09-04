import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, Moon, Palette, RotateCcw, Sun } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTheme } from '@/context/ThemeContext'
import { useToast } from '@/hooks/use-toast'
import { darkTheme, lightTheme } from '@/lib/theme'

type ThemeConfig = Record<string, string>
type ThemeMode = 'light' | 'dark'
type Token = { key: string; label: string; variable: string; category: 'surface' | 'text' | 'brand' | 'status' | 'border' }

const TOKENS: Token[] = [
  { key: 'surface-primary', label: 'Primary surface', variable: '--color-surface-primary', category: 'surface' },
  { key: 'surface-secondary', label: 'Secondary surface', variable: '--color-surface-secondary', category: 'surface' },
  { key: 'surface-tertiary', label: 'Tertiary surface', variable: '--color-surface-tertiary', category: 'surface' },
  { key: 'text-primary', label: 'Primary text', variable: '--color-text-primary', category: 'text' },
  { key: 'text-secondary', label: 'Secondary text', variable: '--color-text-secondary', category: 'text' },
  { key: 'brand-primary', label: 'Primary brand', variable: '--color-brand-primary', category: 'brand' },
  { key: 'brand-primary-hover', label: 'Brand hover', variable: '--color-brand-primary-hover', category: 'brand' },
  { key: 'status-success', label: 'Success', variable: '--color-status-success', category: 'status' },
  { key: 'status-warning', label: 'Warning', variable: '--color-status-warning', category: 'status' },
  { key: 'status-error', label: 'Error', variable: '--color-status-error', category: 'status' },
  { key: 'status-info', label: 'Info', variable: '--color-status-info', category: 'status' },
  { key: 'border-default', label: 'Default border', variable: '--color-border-default', category: 'border' },
  { key: 'border-strong', label: 'Strong border', variable: '--color-border-strong', category: 'border' },
]

const STORAGE_KEYS: Record<ThemeMode, string> = { light: 'light-theme-config', dark: 'dark-theme-config' }

function readConfig(mode: ThemeMode, fallback: ThemeConfig): ThemeConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[mode])
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? { ...fallback, ...parsed } : fallback
  } catch { return fallback }
}

function rgbToHex(value: string): string {
  const match = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (!match) return '#ffffff'
  return `#${Number(match[1]).toString(16).padStart(2, '0')}${Number(match[2]).toString(16).padStart(2, '0')}${Number(match[3]).toString(16).padStart(2, '0')}`
}

function hexToRgb(value: string): string {
  const hex = value.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(hex)) return 'rgb(255, 255, 255)'
  return `rgb(${parseInt(hex.slice(0, 2), 16)}, ${parseInt(hex.slice(2, 4), 16)}, ${parseInt(hex.slice(4, 6), 16)})`
}

export function AppearanceSettings() {
  const { theme: currentTheme } = useTheme()
  const { toast } = useToast()
  const [activeMode, setActiveMode] = useState<ThemeMode>(currentTheme === 'dark' ? 'dark' : 'light')
  const [lightConfig, setLightConfig] = useState<ThemeConfig>(() => readConfig('light', lightTheme))
  const [darkConfig, setDarkConfig] = useState<ThemeConfig>(() => readConfig('dark', darkTheme))
  const [copied, setCopied] = useState<string | null>(null)
  const config = activeMode === 'light' ? lightConfig : darkConfig
  const setConfig = activeMode === 'light' ? setLightConfig : setDarkConfig

  useEffect(() => {
    if (activeMode !== currentTheme) return
    const next = activeMode === 'light' ? lightConfig : darkConfig
    Object.entries(next).forEach(([variable, value]) => document.documentElement.style.setProperty(variable, value))
  }, [activeMode, currentTheme, darkConfig, lightConfig])

  const groupedTokens = useMemo(() => TOKENS.reduce<Record<string, Token[]>>((groups, token) => {
    ;(groups[token.category] ??= []).push(token)
    return groups
  }, {}), [])

  const updateToken = (variable: string, value: string) => {
    setConfig(previous => ({ ...previous, [variable]: value }))
    if (activeMode === currentTheme) document.documentElement.style.setProperty(variable, value)
  }

  const saveTheme = () => {
    localStorage.setItem(STORAGE_KEYS[activeMode], JSON.stringify(config))
    toast({ title: `${activeMode === 'light' ? 'Light' : 'Dark'} theme saved` })
  }

  const resetTheme = () => {
    const defaults = activeMode === 'light' ? lightTheme : darkTheme
    setConfig(defaults)
    Object.entries(defaults).forEach(([variable, value]) => document.documentElement.style.setProperty(variable, value))
    localStorage.removeItem(STORAGE_KEYS[activeMode])
    toast({ title: `${activeMode === 'light' ? 'Light' : 'Dark'} theme restored` })
  }

  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(value)
      window.setTimeout(() => setCopied(null), 1600)
    } catch { toast({ title: 'Could not copy value', variant: 'destructive' }) }
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <CardHeader className="border-b border-border bg-muted/20 px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Palette className="h-5 w-5" /></div>
            <div><CardTitle className="text-lg">Appearance</CardTitle><CardDescription className="mt-1">Control the workspace theme and semantic colors.</CardDescription></div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-5 sm:p-6">
          <Tabs value={activeMode} onValueChange={value => setActiveMode(value as ThemeMode)}>
            <TabsList className="grid h-11 w-full max-w-md grid-cols-2 rounded-xl bg-muted p-1">
              <TabsTrigger value="light" className="rounded-lg gap-2 text-sm"><Sun className="h-4 w-4" /> Light mode</TabsTrigger>
              <TabsTrigger value="dark" className="rounded-lg gap-2 text-sm"><Moon className="h-4 w-4" /> Dark mode</TabsTrigger>
            </TabsList>
            {(['light', 'dark'] as ThemeMode[]).map(mode => (
              <TabsContent key={mode} value={mode} className="mt-6 space-y-6">
                <Alert className="rounded-xl border-border bg-muted/30">
                  {mode === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  <AlertDescription>Edit semantic tokens for {mode} mode. Changes preview immediately when that mode is active.</AlertDescription>
                </Alert>
                {Object.entries(groupedTokens).map(([category, tokens]) => (
                  <section key={category} className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="border-b border-border bg-muted/20 px-5 py-4"><h3 className="text-sm font-semibold capitalize">{category} colors</h3></div>
                    <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
                      {tokens.map(token => {
                        const value = (mode === 'light' ? lightConfig : darkConfig)[token.variable] ?? ''
                        return (
                          <div key={token.key} className="space-y-2">
                            <Label htmlFor={`${mode}-${token.key}`}>{token.label}</Label>
                            <div className="flex items-center gap-2">
                              <Input id={`${mode}-${token.key}-color`} type="color" value={rgbToHex(value)} onChange={event => { setActiveMode(mode); updateToken(token.variable, hexToRgb(event.target.value)) }} className="h-11 w-12 shrink-0 cursor-pointer p-1" />
                              <Input id={`${mode}-${token.key}`} value={value} onChange={event => { setActiveMode(mode); updateToken(token.variable, event.target.value) }} className="font-mono text-xs" placeholder="rgb(0, 0, 0)" />
                              <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-xl" onClick={() => copyValue(value)} aria-label={`Copy ${token.label}`}>
                                {copied === value ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </section>
                ))}
                <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-end">
                  <Button type="button" variant="outline" onClick={resetTheme} className="rounded-xl"><RotateCcw className="mr-2 h-4 w-4" /> Reset</Button>
                  <Button type="button" onClick={saveTheme} className="rounded-xl">Save {mode} theme</Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
