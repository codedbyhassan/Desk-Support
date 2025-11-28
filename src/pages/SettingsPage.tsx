import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDashboardTab } from '@/context/DashboardTabContext'
import { Switch } from '@/components/ui/switch'
import { Settings, Bell, User, Building2, Palette, Shield, Loader2, Sparkles } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTheme } from '@/context/ThemeContext'
import { useToast } from '@/hooks/use-toast'

// Predefined theme palettes
interface ThemePalette {
  primary: string
  secondary: string
  background: string
  foreground: string
  card: string
  muted: string
  mutedForeground: string
}

interface ThemePalettes {
  [category: string]: {
    [paletteName: string]: ThemePalette
  }
}

const themePalettes: ThemePalettes = {
  pastel: {
    'Pastel Bloom': {
      primary: '330 80% 80%',
      secondary: '200 60% 75%',
      background: '0 0% 98%',
      foreground: '220 15% 25%',
      card: '0 0% 100%',
      muted: '210 40% 96%',
      mutedForeground: '215 16% 47%',
    },
    'Dream Cloud': {
      primary: '260 70% 78%',
      secondary: '120 40% 75%',
      background: '0 0% 99%',
      foreground: '210 20% 20%',
      card: '0 0% 100%',
      muted: '210 40% 95%',
      mutedForeground: '215 14% 50%',
    },
    'Sweet Peach': {
      primary: '15 85% 75%',
      secondary: '190 60% 80%',
      background: '0 0% 97%',
      foreground: '210 15% 25%',
      card: '0 0% 100%',
      muted: '20 40% 94%',
      mutedForeground: '25 10% 45%',
    },
  },
  vintage: {
    'Old Photo': {
      primary: '30 30% 45%',
      secondary: '50 25% 55%',
      background: '40 30% 95%',
      foreground: '30 20% 20%',
      card: '0 0% 100%',
      muted: '40 15% 88%',
      mutedForeground: '35 10% 40%',
    },
    'Retro Olive': {
      primary: '65 35% 45%',
      secondary: '15 40% 50%',
      background: '40 30% 96%',
      foreground: '30 20% 25%',
      muted: '50 25% 90%',
      mutedForeground: '45 10% 45%',
    },
    'Dust & Denim': {
      primary: '220 25% 45%',
      secondary: '30 30% 55%',
      background: '45 20% 94%',
      foreground: '210 20% 15%',
      muted: '45 20% 90%',
      mutedForeground: '215 10% 45%',
    },
  },
  dark: {
    'Midnight Blue': {
      primary: '220 80% 60%',
      secondary: '160 60% 50%',
      background: '220 40% 8%',
      foreground: '0 0% 98%',
      card: '220 35% 10%',
      muted: '220 30% 15%',
      mutedForeground: '220 10% 60%',
    },
    'Obsidian': {
      primary: '200 100% 60%',
      secondary: '330 80% 60%',
      background: '240 30% 5%',
      foreground: '0 0% 100%',
      card: '240 25% 8%',
      muted: '240 20% 12%',
      mutedForeground: '240 10% 60%',
    },
    'Deep Slate': {
      primary: '210 70% 55%',
      secondary: '50 60% 45%',
      background: '240 20% 8%',
      foreground: '0 0% 96%',
      card: '240 18% 12%',
      muted: '240 15% 15%',
      mutedForeground: '240 8% 65%',
    },
  },
  neon: {
    'Cyber Night': {
      primary: '160 100% 50%',
      secondary: '280 100% 65%',
      background: '240 30% 10%',
      foreground: '0 0% 100%',
      card: '240 25% 12%',
      muted: '240 20% 18%',
      mutedForeground: '160 30% 70%',
    },
    'Laser Grid': {
      primary: '330 100% 60%',
      secondary: '200 100% 55%',
      background: '230 40% 5%',
      foreground: '0 0% 100%',
      card: '230 35% 8%',
      muted: '230 30% 12%',
      mutedForeground: '200 20% 70%',
    },
    'Night Drive': {
      primary: '50 100% 60%',
      secondary: '200 100% 50%',
      background: '240 50% 6%',
      foreground: '0 0% 98%',
      card: '240 40% 10%',
      muted: '240 35% 15%',
      mutedForeground: '50 20% 75%',
    },
  },
  nature: {
    'Forest Trail': {
      primary: '140 40% 40%',
      secondary: '30 35% 45%',
      background: '80 25% 95%',
      foreground: '30 25% 25%',
      card: '0 0% 100%',
      muted: '80 20% 88%',
      mutedForeground: '80 10% 45%',
    },
    'Earth Moss': {
      primary: '90 40% 40%',
      secondary: '60 30% 35%',
      background: '80 25% 94%',
      foreground: '30 20% 20%',
      card: '0 0% 100%',
      muted: '80 20% 88%',
      mutedForeground: '80 10% 40%',
    },
    'Leaflight': {
      primary: '110 50% 50%',
      secondary: '45 40% 55%',
      background: '90 35% 97%',
      foreground: '210 20% 25%',
      card: '0 0% 100%',
      muted: '90 30% 90%',
      mutedForeground: '90 15% 45%',
    },
  },
  ocean: {
    'Aqua Tide': {
      primary: '190 90% 50%',
      secondary: '170 70% 45%',
      background: '190 70% 97%',
      foreground: '210 25% 25%',
      card: '0 0% 100%',
      muted: '190 40% 92%',
      mutedForeground: '190 20% 45%',
    },
    'Deep Ocean': {
      primary: '200 70% 55%',
      secondary: '220 50% 45%',
      background: '220 30% 10%',
      foreground: '0 0% 98%',
      card: '220 25% 12%',
      muted: '220 20% 18%',
      mutedForeground: '200 15% 70%',
    },
    'Coral Reef': {
      primary: '15 80% 60%',
      secondary: '190 70% 50%',
      background: '180 80% 96%',
      foreground: '220 25% 25%',
      card: '0 0% 100%',
      muted: '180 40% 90%',
      mutedForeground: '180 20% 45%',
    },
  },
  sunset: {
    'Golden Hour': {
      primary: '30 90% 55%',
      secondary: '10 80% 50%',
      background: '45 70% 96%',
      foreground: '25 25% 25%',
      card: '0 0% 100%',
      muted: '45 40% 90%',
      mutedForeground: '45 20% 45%',
    },
    'Dusk Orange': {
      primary: '20 80% 55%',
      secondary: '330 70% 60%',
      background: '45 70% 97%',
      foreground: '210 25% 25%',
      card: '0 0% 100%',
      muted: '20 40% 92%',
      mutedForeground: '20 20% 45%',
    },
    'Evening Glow': {
      primary: '15 85% 55%',
      secondary: '45 90% 55%',
      background: '45 70% 96%',
      foreground: '210 25% 25%',
      card: '0 0% 100%',
      muted: '45 40% 90%',
      mutedForeground: '45 20% 45%',
    },
  },
  professional: {
    'Corporate Blue': {
      primary: '217 91% 60%',
      secondary: '162 73% 46%',
      background: '0 0% 100%',
      foreground: '222 47% 11%',
      card: '0 0% 100%',
      muted: '210 40% 96%',
      mutedForeground: '215 16% 47%',
    },
    'Executive': {
      primary: '220 70% 50%',
      secondary: '200 60% 45%',
      background: '0 0% 98%',
      foreground: '220 20% 15%',
      card: '0 0% 100%',
      muted: '220 20% 93%',
      mutedForeground: '220 15% 45%',
    },
    'Modern Office': {
      primary: '210 80% 55%',
      secondary: '180 50% 50%',
      background: '210 30% 98%',
      foreground: '210 25% 20%',
      card: '0 0% 100%',
      muted: '210 30% 94%',
      mutedForeground: '210 15% 45%',
    },
  },
}

export default function SettingsPage() {
  const { toast } = useToast()
  const { user, company, settings, loading, updateProfile, updateCompany, updateSettings } = useAuth()
  const { activeTab, setActiveTab } = useDashboardTab()
  const { updateCustomTheme, updateThemeSettings, setTheme: setThemeMode } = useTheme()
  const settingsTabs = ['profile', 'company', 'appearance', 'notifications', 'security'] as const
  const normalizedTab = (settingsTabs as readonly string[]).includes(activeTab) ? activeTab : settingsTabs[0]
  const isAdmin = user?.role === 'admin'

  useEffect(() => {
    if (activeTab !== normalizedTab) {
      setActiveTab(normalizedTab)
    }
  }, [activeTab, normalizedTab, setActiveTab])

  const [companyName, setCompanyName] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  
  const [theme, setLocalTheme] = useState({
    // Colors in HSL format
    primary: '217 91% 60%',
    primaryForeground: '0 0% 100%',
    secondary: '162 73% 46%',
    secondaryForeground: '0 0% 100%',
    background: '0 0% 100%',
    foreground: '222 47% 11%',
    card: '0 0% 100%',
    cardForeground: '222 47% 11%',
    popover: '0 0% 100%',
    popoverForeground: '222 47% 11%',
    muted: '210 40% 96%',
    mutedForeground: '215 16% 47%',
    accent: '210 40% 96%',
    accentForeground: '222 47% 11%',
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 100%',
    border: '214 32% 91%',
    input: '214 32% 91%',
    ring: '217 91% 60%',
    // Typography
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fontSize: '16',
    fontWeight: '400',
    // Radius
    radius: '0.5',
  })

  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedPalette, setSelectedPalette] = useState('')

  // Initialize form values when data loads
  useEffect(() => {
    if (company) {
      setCompanyName(company.name || '')
    }
    if (user) {
      setFullName(user.full_name || '')
      setPhone(user.phone || '')
    }
  }, [company, user])

  // Load theme from settings
  useEffect(() => {
    if (settings?.theme) {
      try {
        const savedTheme = JSON.parse(settings.theme)
        setLocalTheme(savedTheme)
        applyThemeToDOM(savedTheme)
        syncThemeContext(savedTheme)
      } catch (error) {
        console.error('Error loading theme:', error)
      }
    }
  }, [settings])

  const applyThemeToDOM = (themeObj: typeof theme) => {
    const root = document.documentElement
    
    // Apply colors
    Object.entries(themeObj).forEach(([key, value]) => {
      if (key === 'fontFamily' || key === 'fontSize' || key === 'fontWeight' || key === 'radius') return
      const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase()
      root.style.setProperty(`--${cssVar}`, value as string)
    })
    
    // Apply typography
    if (themeObj.fontFamily) {
      root.style.setProperty('--font-sans', themeObj.fontFamily)
      document.body.style.fontFamily = themeObj.fontFamily
    }
    if (themeObj.fontSize) {
      root.style.fontSize = `${themeObj.fontSize}px`
    }
    if (themeObj.fontWeight) {
      root.style.fontWeight = themeObj.fontWeight
    }
    
    // Apply border radius
    if (themeObj.radius) {
      root.style.setProperty('--radius', `${themeObj.radius}rem`)
    }
  }

  // Keep ThemeContext in sync so sidebar / global theming also update live
  const syncThemeContext = (themeObj: typeof theme) => {
    // Map core colors into ThemeContext's hex-based customTheme
    updateCustomTheme({
      primary: hslToHex(themeObj.primary),
      secondary: hslToHex(themeObj.secondary),
      accent: hslToHex(themeObj.accent || themeObj.primary),
      background: hslToHex(themeObj.background),
      foreground: hslToHex(themeObj.foreground),
      muted: hslToHex(themeObj.muted),
      border: hslToHex(themeObj.border),
      destructive: hslToHex(themeObj.destructive),
      warning: hslToHex(themeObj.destructive), // simple mapping; can be extended
    })

    // Map sizing into ThemeContext's themeSettings
    updateThemeSettings({
      fontSize: Number(themeObj.fontSize) || 16,
      borderRadius: Number(themeObj.radius) * 16 || 8, // rem -> px
    })
  }

  // Convert hex to HSL
  const hexToHsl = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255

    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    let h = 0
    let s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
        case g: h = ((b - r) / d + 2) / 6; break
        case b: h = ((r - g) / d + 4) / 6; break
      }
    }

    h = Math.round(h * 360)
    s = Math.round(s * 100)
    const lPercent = Math.round(l * 100)

    return `${h} ${s}% ${lPercent}%`
  }

  // Convert HSL string to hex for color picker
  const hslToHex = (hsl: string): string => {
    const [h, s, l] = hsl.split(' ').map((v: string) => parseFloat(v))
    const sDecimal = s / 100
    const lDecimal = l / 100
    
    const c = (1 - Math.abs(2 * lDecimal - 1)) * sDecimal
    const x = c * (1 - Math.abs((h / 60) % 2 - 1))
    const m = lDecimal - c / 2
    
    let r = 0, g = 0, b = 0
    
    if (h < 60) {
      r = c; g = x; b = 0
    } else if (h < 120) {
      r = x; g = c; b = 0
    } else if (h < 180) {
      r = 0; g = c; b = x
    } else if (h < 240) {
      r = 0; g = x; b = c
    } else if (h < 300) {
      r = x; g = 0; b = c
    } else {
      r = c; g = 0; b = x
    }
    
    const toHex = (val: number): string => {
      const hex = Math.round((val + m) * 255).toString(16)
      return hex.length === 1 ? '0' + hex : hex
    }
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`
  }

  const handleThemeChange = (key: string, value: string) => {
    const newTheme = { ...theme, [key]: value }
    setLocalTheme(newTheme)
    applyThemeToDOM(newTheme)
    syncThemeContext(newTheme)
  }

  const applyPredefinedPalette = (category: string, paletteName: string) => {
    const palette = themePalettes[category]?.[paletteName]
    if (!palette) return

    const newTheme = {
      ...theme,
      primary: palette.primary,
      secondary: palette.secondary,
      background: palette.background,
      foreground: palette.foreground,
      card: palette.card,
      cardForeground: palette.foreground,
      popover: palette.card,
      popoverForeground: palette.foreground,
      muted: palette.muted,
      mutedForeground: palette.mutedForeground,
      accent: palette.muted,
      accentForeground: palette.foreground,
      border: palette.muted,
      input: palette.muted,
      ring: palette.primary,
      primaryForeground: '0 0% 100%',
      secondaryForeground: '0 0% 100%',
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 100%',
    }

    setTheme(newTheme)
    applyThemeToDOM(newTheme)
    setSelectedCategory(category)
    setSelectedPalette(paletteName)
    syncThemeContext(newTheme)
  }

  // Apply full base presets that mirror the existing index.css light & dark designs
  const applyBasePreset = (mode: 'light' | 'dark') => {
    if (mode === 'light') {
      const lightTheme = {
        primary: '217 91% 60%',
        primaryForeground: '0 0% 100%',
        secondary: '217 80% 94%',
        secondaryForeground: '217 91% 60%',
        background: '0 0% 100%',
        foreground: '222 47% 11%',
        card: '0 0% 100%',
        cardForeground: '222 47% 11%',
        popover: '0 0% 100%',
        popoverForeground: '222 47% 11%',
        muted: '220 14% 96%',
        mutedForeground: '215 16% 47%',
        accent: '24 95% 53%',
        accentForeground: '0 0% 100%',
        destructive: '0 84% 60%',
        destructiveForeground: '0 0% 100%',
        border: '220 13% 91%',
        input: '220 13% 91%',
        ring: '217 91% 60%',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '16',
        fontWeight: '400',
        radius: '0.5',
      }
      setLocalTheme(lightTheme)
      applyThemeToDOM(lightTheme)
      syncThemeContext(lightTheme)
      setThemeMode('light')
    } else {
      // Dark mode values taken from index.css .dark block
      const darkTheme = {
        primary: '280 62% 22%',
        primaryForeground: '15 75% 91%',
        secondary: '285 35% 27%',
        secondaryForeground: '6 40% 80%',
        background: '300 100% 5%',
        foreground: '6 40% 80%',
        card: '280 62% 18%',
        cardForeground: '6 40% 80%',
        popover: '285 35% 27%',
        popoverForeground: '6 40% 80%',
        muted: '330 25% 42%',
        mutedForeground: '15 75% 91%',
        accent: '330 25% 42%',
        accentForeground: '15 75% 91%',
        destructive: '0 84% 60%',
        destructiveForeground: '15 75% 91%',
        border: '280 62% 25%',
        input: '280 62% 25%',
        ring: '280 62% 30%',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '16',
        fontWeight: '400',
        radius: '0.5',
      }
      setLocalTheme(darkTheme)
      applyThemeToDOM(darkTheme)
      syncThemeContext(darkTheme)
      setThemeMode('dark')
    }
  }

  const handleSaveTheme = async () => {
    if (!isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'Only admins can update theme settings',
        variant: 'destructive'
      })
      return
    }

    setSaving(true)
    try {
      await updateSettings({
        theme: JSON.stringify(theme)
      })
      toast({
        title: 'Success',
        description: 'Theme saved successfully'
      })
    } catch (error) {
      console.error('Error saving theme:', error)
      toast({
        title: 'Error',
        description: 'Failed to save theme',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const resetTheme = () => {
    const defaultTheme = {
      primary: '217 91% 60%',
      primaryForeground: '0 0% 100%',
      secondary: '162 73% 46%',
      secondaryForeground: '0 0% 100%',
      background: '0 0% 100%',
      foreground: '222 47% 11%',
      card: '0 0% 100%',
      cardForeground: '222 47% 11%',
      popover: '0 0% 100%',
      popoverForeground: '222 47% 11%',
      muted: '210 40% 96%',
      mutedForeground: '215 16% 47%',
      accent: '210 40% 96%',
      accentForeground: '222 47% 11%',
      destructive: '0 84% 60%',
      destructiveForeground: '0 0% 100%',
      border: '214 32% 91%',
      input: '214 32% 91%',
      ring: '217 91% 60%',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '16',
      fontWeight: '400',
      radius: '0.5',
    }
    setLocalTheme(defaultTheme)
    applyThemeToDOM(defaultTheme)
    syncThemeContext(defaultTheme)
  }

  const handleUpdateCompany = async () => {
    if (!isAdmin) {
      toast({
        title: 'Access Denied',
        description: 'Only admins can update company information',
        variant: 'destructive'
      })
      return
    }

    setSaving(true)
    try {
      await updateCompany({ name: companyName })
      toast({
        title: 'Success',
        description: 'Company name updated successfully'
      })
    } catch (error) {
      console.error('Error updating company:', error)
      toast({
        title: 'Error',
        description: 'Failed to update company',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateProfile = async () => {
    setSaving(true)
    try {
      await updateProfile({ 
        full_name: fullName,
        phone: phone 
      })
      toast({
        title: 'Success',
        description: 'Profile updated successfully'
      })
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="px-2 sm:px-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground md:text-3xl flex items-center gap-2">
            <Settings className="h-6 w-6 sm:h-7 sm:w-7" />
            <span className="truncate">Settings</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground md:text-base mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={normalizedTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto bg-card rounded-lg p-1 shadow-sm hidden">
            <TabsTrigger value="profile" className="gap-2 text-xs sm:text-sm">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-2 text-xs sm:text-sm">
              <Building2 className="h-4 w-4" />
              Company
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2 text-xs sm:text-sm">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 text-xs sm:text-sm">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2 text-xs sm:text-sm">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-3 sm:space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Profile Information</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Update your account profile information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs sm:text-sm">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-muted h-10 sm:h-11 text-xs sm:text-sm"
                  />
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-xs sm:text-sm">Full Name</Label>
                  <Input 
                    id="name" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className="h-10 sm:h-11 text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-xs sm:text-sm">Phone</Label>
                  <Input 
                    id="phone" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter your phone number"
                    className="h-10 sm:h-11 text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Role</Label>
                  <Input
                    value={user?.role || ''}
                    disabled
                    className="bg-muted h-10 sm:h-11 text-xs sm:text-sm capitalize"
                  />
                </div>
                <Button onClick={handleUpdateProfile} disabled={saving} className="h-10 sm:h-11 text-xs sm:text-sm w-full sm:w-auto">
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Company Tab */}
          <TabsContent value="company" className="space-y-3 sm:space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Company Information</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  View and manage your company details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                {!isAdmin && (
                  <Alert>
                    <AlertDescription className="text-xs sm:text-sm">
                      Only admins can update company information
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="company-name" className="text-xs sm:text-sm">Company Name</Label>
                  <Input
                    id="company-name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={!isAdmin}
                    className={`h-10 sm:h-11 text-xs sm:text-sm ${!isAdmin ? 'bg-muted' : ''}`}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Company ID</Label>
                  <Input
                    value={company?.id || 'Loading...'}
                    disabled
                    className="font-mono text-[10px] sm:text-xs bg-muted h-10 sm:h-11"
                  />
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    This ID is used to isolate your company data
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Subscription Plan</Label>
                  <Input
                    value={company?.subscription_plan || 'Free'}
                    disabled
                    className="bg-muted h-10 sm:h-11 text-xs sm:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm">Created</Label>
                  <Input
                    value={company ? new Date(company.created_at).toLocaleDateString() : 'Loading...'}
                    disabled
                    className="bg-muted h-10 sm:h-11 text-xs sm:text-sm"
                  />
                </div>
                {isAdmin && (
                  <Button onClick={handleUpdateCompany} disabled={saving} className="h-10 sm:h-11 text-xs sm:text-sm w-full sm:w-auto">
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-4 mt-6">
            {/* Base Light/Dark Presets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Base Theme Mode
                </CardTitle>
                <CardDescription>
                  Start from the existing light or dark design, then tweak every detail below.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:gap-3 lg:gap-4 grid-cols-1 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => applyBasePreset('light')}
                    className="group flex flex-col items-stretch rounded-lg sm:rounded-xl border border-border bg-background p-2 sm:p-3 lg:p-4 hover:border-primary hover:shadow-md transition-all text-left touch-target"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm font-medium">Light Design</span>
                    </div>
                    <div className="rounded-md border border-border bg-white p-2 space-y-1.5 sm:space-y-2">
                      <div className="h-1 sm:h-1.5 w-12 sm:w-16 rounded-full bg-[hsl(217_91%_60%)]" />
                      <div className="h-5 sm:h-6 rounded-md bg-[hsl(217_80%_94%)]" />
                      <div className="flex gap-1">
                        <div className="h-5 sm:h-6 flex-1 rounded-md bg-[hsl(210_40%_96%)]" />
                        <div className="h-5 sm:h-6 w-6 sm:w-8 rounded-md bg-[hsl(24_95%_53%)]" />
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyBasePreset('dark')}
                    className="group flex flex-col items-stretch rounded-lg sm:rounded-xl border border-border bg-background p-2 sm:p-3 lg:p-4 hover:border-primary hover:shadow-md transition-all text-left touch-target"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs sm:text-sm font-medium">Dark Design</span>
                    </div>
                    <div className="rounded-md border border-border bg-[hsl(300_100%_5%)] p-2 space-y-1.5 sm:space-y-2">
                      <div className="h-1 sm:h-1.5 w-12 sm:w-16 rounded-full bg-[hsl(280_62%_22%)]" />
                      <div className="h-5 sm:h-6 rounded-md bg-[hsl(285_35%_27%)]" />
                      <div className="flex gap-1">
                        <div className="h-5 sm:h-6 flex-1 rounded-md bg-[hsl(330_25%_42%)]" />
                        <div className="h-5 sm:h-6 w-6 sm:w-8 rounded-md bg-[hsl(280_62%_22%)]" />
                      </div>
                    </div>
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Predefined Palettes Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Quick Theme Palettes
                </CardTitle>
                <CardDescription>
                  Choose from professionally designed color palettes - perfect for those who want instant results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isAdmin && (
                  <Alert>
                    <AlertDescription>
                      Only admins can save theme changes for the entire company
                    </AlertDescription>
                  </Alert>
                )}

                {/* Palette Categories */}
                <div className="grid gap-4 sm:gap-6">
                  {Object.entries(themePalettes).map(([category, palettes]) => (
                    <div key={category} className="space-y-2 sm:space-y-3">
                      <h3 className="text-xs sm:text-sm font-semibold capitalize flex items-center gap-2">
                        {category}
                        <span className="text-[10px] sm:text-xs text-muted-foreground font-normal">
                          ({Object.keys(palettes).length} palettes)
                        </span>
                      </h3>
                      <div className="grid gap-2 sm:gap-3 lg:gap-4 grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(palettes).map(([paletteName, colors]) => (
                          <button
                            key={paletteName}
                            onClick={() => applyPredefinedPalette(category, paletteName)}
                            className={`
                              relative rounded-lg sm:rounded-xl border-2 p-2 sm:p-3 lg:p-4 text-left transition-all hover:shadow-md touch-target h-24 sm:h-28 lg:h-32
                              ${selectedCategory === category && selectedPalette === paletteName
                                ? 'border-primary shadow-md'
                                : 'border-border hover:border-primary/50'
                              }
                            `}
                          >
                            <div className="space-y-1.5 sm:space-y-2 h-full flex flex-col">
                              <p className="font-medium text-[10px] sm:text-xs lg:text-sm truncate">{paletteName}</p>
                              <div className="flex gap-1 flex-1">
                                {['primary', 'secondary', 'background', 'foreground'].map((key) => {
                                  const hsl = colors[key]
                                  return (
                                    <div
                                      key={key}
                                      className="flex-1 rounded border border-gray-200"
                                      style={{ background: `hsl(${hsl})` }}
                                      title={key}
                                    />
                                  )
                                })}
                              </div>
                            </div>
                            {selectedCategory === category && selectedPalette === paletteName && (
                              <div className="absolute top-1 right-1 sm:top-2 sm:right-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-primary flex items-center justify-center">
                                <svg className="h-2 w-2 sm:h-3 sm:w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <Alert>
                  <AlertDescription>
                    💡 <strong>Quick Start:</strong> Click any palette to apply it instantly. You can then customize individual colors below if needed.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Custom Theme Card */}
            <Card>
              <CardHeader>
                <CardTitle>Complete Theme Customization</CardTitle>
                <CardDescription>
                  Customize every aspect of your app's appearance - colors, typography, and more
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!isAdmin && (
                  <Alert>
                    <AlertDescription>
                      Only admins can save theme changes for the entire company
                    </AlertDescription>
                  </Alert>
                )}

                {/* Typography Section */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold">Typography</h3>
                  <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="fontFamily" className="text-xs sm:text-sm">Font Family</Label>
                      <Select 
                        value={theme.fontFamily} 
                        onValueChange={(value) => handleThemeChange('fontFamily', value)}
                      >
                        <SelectTrigger id="fontFamily" className="h-10 sm:h-11 text-xs sm:text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system-ui, -apple-system, sans-serif">System Default</SelectItem>
                          <SelectItem value="'Inter', sans-serif">Inter</SelectItem>
                          <SelectItem value="'Roboto', sans-serif">Roboto</SelectItem>
                          <SelectItem value="'Open Sans', sans-serif">Open Sans</SelectItem>
                          <SelectItem value="'Lato', sans-serif">Lato</SelectItem>
                          <SelectItem value="'Poppins', sans-serif">Poppins</SelectItem>
                          <SelectItem value="'Montserrat', sans-serif">Montserrat</SelectItem>
                          <SelectItem value="Georgia, serif">Georgia (Serif)</SelectItem>
                          <SelectItem value="'Courier New', monospace">Courier (Mono)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fontSize" className="text-xs sm:text-sm">Base Font Size (px)</Label>
                      <Input
                        id="fontSize"
                        type="number"
                        min="12"
                        max="24"
                        value={theme.fontSize}
                        onChange={(e) => handleThemeChange('fontSize', e.target.value)}
                        className="h-10 sm:h-11 text-xs sm:text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="radius" className="text-xs sm:text-sm">Border Radius (rem)</Label>
                      <Input
                        id="radius"
                        type="number"
                        min="0"
                        max="2"
                        step="0.1"
                        value={theme.radius}
                        onChange={(e) => handleThemeChange('radius', e.target.value)}
                        className="h-10 sm:h-11 text-xs sm:text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Colors */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold">Primary Colors</h3>
                  <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="primary" className="text-xs sm:text-sm">Primary</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={hslToHex(theme.primary)}
                          onChange={(e) => handleThemeChange('primary', hexToHsl(e.target.value))}
                          className="w-12 sm:w-14 h-10 sm:h-11 cursor-pointer flex-shrink-0"
                        />
                        <Input
                          id="primary"
                          value={theme.primary}
                          onChange={(e) => handleThemeChange('primary', e.target.value)}
                          placeholder="217 91% 60%"
                          className="flex-1 h-10 sm:h-11 text-xs sm:text-sm"
                        />
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Main brand color, buttons, links</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secondary" className="text-xs sm:text-sm">Secondary</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={hslToHex(theme.secondary)}
                          onChange={(e) => handleThemeChange('secondary', hexToHsl(e.target.value))}
                          className="w-12 sm:w-14 h-10 sm:h-11 cursor-pointer flex-shrink-0"
                        />
                        <Input
                          id="secondary"
                          value={theme.secondary}
                          onChange={(e) => handleThemeChange('secondary', e.target.value)}
                          placeholder="162 73% 46%"
                          className="flex-1 h-10 sm:h-11 text-xs sm:text-sm"
                        />
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Secondary actions and accents</p>
                    </div>
                  </div>
                </div>

                {/* Background & Text Colors */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold">Background & Text</h3>
                  <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="background" className="text-xs sm:text-sm">Background</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={hslToHex(theme.background)}
                          onChange={(e) => handleThemeChange('background', hexToHsl(e.target.value))}
                          className="w-12 sm:w-14 h-10 sm:h-11 cursor-pointer flex-shrink-0"
                        />
                        <Input
                          id="background"
                          value={theme.background}
                          onChange={(e) => handleThemeChange('background', e.target.value)}
                          className="flex-1 h-10 sm:h-11 text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="foreground" className="text-xs sm:text-sm">Text Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={hslToHex(theme.foreground)}
                          onChange={(e) => handleThemeChange('foreground', hexToHsl(e.target.value))}
                          className="w-12 sm:w-14 h-10 sm:h-11 cursor-pointer flex-shrink-0"
                        />
                        <Input
                          id="foreground"
                          value={theme.foreground}
                          onChange={(e) => handleThemeChange('foreground', e.target.value)}
                          className="flex-1 h-10 sm:h-11 text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="card" className="text-xs sm:text-sm">Card Background</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={hslToHex(theme.card)}
                          onChange={(e) => handleThemeChange('card', hexToHsl(e.target.value))}
                          className="w-12 sm:w-14 h-10 sm:h-11 cursor-pointer flex-shrink-0"
                        />
                        <Input
                          id="card"
                          value={theme.card}
                          onChange={(e) => handleThemeChange('card', e.target.value)}
                          className="flex-1 h-10 sm:h-11 text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="muted" className="text-xs sm:text-sm">Muted Background</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={hslToHex(theme.muted)}
                          onChange={(e) => handleThemeChange('muted', hexToHsl(e.target.value))}
                          className="w-12 sm:w-14 h-10 sm:h-11 cursor-pointer flex-shrink-0"
                        />
                        <Input
                          id="muted"
                          value={theme.muted}
                          onChange={(e) => handleThemeChange('muted', e.target.value)}
                          className="flex-1 h-10 sm:h-11 text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mutedForeground" className="text-xs sm:text-sm">Muted Text</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={hslToHex(theme.mutedForeground)}
                          onChange={(e) => handleThemeChange('mutedForeground', hexToHsl(e.target.value))}
                          className="w-12 sm:w-14 h-10 sm:h-11 cursor-pointer flex-shrink-0"
                        />
                        <Input
                          id="mutedForeground"
                          value={theme.mutedForeground}
                          onChange={(e) => handleThemeChange('mutedForeground', e.target.value)}
                          className="flex-1 h-10 sm:h-11 text-xs sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Accent & Hover Colors */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold">Accent & Hover</h3>
                  <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="accent" className="text-xs sm:text-sm">Accent/Hover Background</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={hslToHex(theme.accent)}
                          onChange={(e) => handleThemeChange('accent', hexToHsl(e.target.value))}
                          className="w-12 sm:w-14 h-10 sm:h-11 cursor-pointer flex-shrink-0"
                        />
                        <Input
                          id="accent"
                          value={theme.accent}
                          onChange={(e) => handleThemeChange('accent', e.target.value)}
                          className="flex-1 h-10 sm:h-11 text-xs sm:text-sm"
                        />
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Hover states on buttons and items</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ring" className="text-xs sm:text-sm">Focus Ring</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={hslToHex(theme.ring)}
                          onChange={(e) => handleThemeChange('ring', hexToHsl(e.target.value))}
                          className="w-12 sm:w-14 h-10 sm:h-11 cursor-pointer flex-shrink-0"
                        />
                        <Input
                          id="ring"
                          value={theme.ring}
                          onChange={(e) => handleThemeChange('ring', e.target.value)}
                          className="flex-1 h-10 sm:h-11 text-xs sm:text-sm"
                        />
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Outline color for focused elements</p>
                    </div>
                  </div>
                </div>

                {/* Borders & Inputs */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold">Borders & Inputs</h3>
                  <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="border" className="text-xs sm:text-sm">Border Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={hslToHex(theme.border)}
                          onChange={(e) => handleThemeChange('border', hexToHsl(e.target.value))}
                          className="w-12 sm:w-14 h-10 sm:h-11 cursor-pointer flex-shrink-0"
                        />
                        <Input
                          id="border"
                          value={theme.border}
                          onChange={(e) => handleThemeChange('border', e.target.value)}
                          className="flex-1 h-10 sm:h-11 text-xs sm:text-sm"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="input" className="text-xs sm:text-sm">Input Border</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={hslToHex(theme.input)}
                          onChange={(e) => handleThemeChange('input', hexToHsl(e.target.value))}
                          className="w-12 sm:w-14 h-10 sm:h-11 cursor-pointer flex-shrink-0"
                        />
                        <Input
                          id="input"
                          value={theme.input}
                          onChange={(e) => handleThemeChange('input', e.target.value)}
                          className="flex-1 h-10 sm:h-11 text-xs sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Destructive Colors */}
                <div className="space-y-3 sm:space-y-4">
                  <h3 className="text-base sm:text-lg font-semibold">Destructive Actions</h3>
                  <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="destructive" className="text-xs sm:text-sm">Destructive Color</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={hslToHex(theme.destructive)}
                          onChange={(e) => handleThemeChange('destructive', hexToHsl(e.target.value))}
                          className="w-12 sm:w-14 h-10 sm:h-11 cursor-pointer flex-shrink-0"
                        />
                        <Input
                          id="destructive"
                          value={theme.destructive}
                          onChange={(e) => handleThemeChange('destructive', e.target.value)}
                          className="flex-1 h-10 sm:h-11 text-xs sm:text-sm"
                        />
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Delete buttons, error states</p>
                    </div>
                  </div>
                </div>

                {/* Live Preview */}
                <div className="rounded-lg border bg-muted/50 p-6 space-y-4">
                  <p className="text-sm font-semibold">Live Preview</p>
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Button>Primary Button</Button>
                      <Button variant="secondary">Secondary</Button>
                      <Button variant="outline">Outline</Button>
                      <Button variant="destructive">Delete</Button>
                    </div>
                    <Card>
                      <CardContent className="p-4">
                        <p className="font-medium text-foreground">Card with text content</p>
                        <p className="text-sm text-muted-foreground mt-1">This is muted text for descriptions</p>
                      </CardContent>
                    </Card>
                    <Input placeholder="Input field with placeholder" />
                    <div className="flex items-center gap-2">
                      <Switch />
                      <Label>Toggle switch example</Label>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
                  <Button variant="outline" onClick={resetTheme} size="lg" className="h-10 sm:h-11 text-xs sm:text-sm">
                    Reset to Default
                  </Button>
                  <Button onClick={handleSaveTheme} disabled={!isAdmin || saving} size="lg" className="h-10 sm:h-11 text-xs sm:text-sm">
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving Theme...
                      </>
                    ) : (
                      'Save Theme'
                    )}
                  </Button>
                </div>

                <Alert>
                  <AlertDescription>
                    💡 <strong>Pro Tip:</strong> All changes apply instantly! Use the color pickers for quick selection or enter HSL values manually (format: "217 91% 60%"). Your entire app will update in real-time including hover effects, focus states, and all UI components.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-3 sm:space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Notification Preferences</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Manage how you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between gap-3 py-2 sm:py-3">
                  <div className="space-y-0.5 min-w-0">
                    <Label className="text-xs sm:text-sm">Email Notifications</Label>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Receive email updates about your tickets
                    </p>
                  </div>
                  <Switch className="flex-shrink-0" />
                </div>
                <div className="flex items-center justify-between gap-3 py-2 sm:py-3">
                  <div className="space-y-0.5 min-w-0">
                    <Label className="text-xs sm:text-sm">Push Notifications</Label>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Receive push notifications in your browser
                    </p>
                  </div>
                  <Switch className="flex-shrink-0" />
                </div>
                <div className="flex items-center justify-between gap-3 py-2 sm:py-3">
                  <div className="space-y-0.5 min-w-0">
                    <Label className="text-xs sm:text-sm">Ticket Updates</Label>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Get notified when tickets are updated
                    </p>
                  </div>
                  <Switch defaultChecked className="flex-shrink-0" />
                </div>
                <div className="flex items-center justify-between gap-3 py-2 sm:py-3">
                  <div className="space-y-0.5 min-w-0">
                    <Label className="text-xs sm:text-sm">New Comments</Label>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Notifications for new ticket comments
                    </p>
                  </div>
                  <Switch defaultChecked className="flex-shrink-0" />
                </div>
                <Button className="h-10 sm:h-11 text-xs sm:text-sm w-full sm:w-auto mt-4">Save Preferences</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-3 sm:space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Security Settings</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Manage your account security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <Alert>
                  <AlertDescription className="text-xs sm:text-sm">
                    Password changes are handled through Supabase authentication. Contact your administrator for password reset.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="current-password" className="text-xs sm:text-sm">Current Password</Label>
                  <Input id="current-password" type="password" placeholder="Enter current password" className="h-10 sm:h-11 text-xs sm:text-sm" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-xs sm:text-sm">New Password</Label>
                  <Input id="new-password" type="password" placeholder="Enter new password" className="h-10 sm:h-11 text-xs sm:text-sm" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-xs sm:text-sm">Confirm Password</Label>
                  <Input id="confirm-password" type="password" placeholder="Confirm new password" className="h-10 sm:h-11 text-xs sm:text-sm" />
                </div>
                <Button className="h-10 sm:h-11 text-xs sm:text-sm w-full sm:w-auto">Update Password</Button>
                
                <div className="pt-4 sm:pt-6 space-y-3 sm:space-y-4 border-t">
                  <h3 className="text-sm sm:text-base font-semibold">Two-Factor Authentication</h3>
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <Label className="text-xs sm:text-sm">Enable 2FA</Label>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <Switch className="flex-shrink-0" />
                  </div>
                </div>

                <div className="pt-4 sm:pt-6 space-y-3 sm:space-y-4 border-t">
                  <h3 className="text-sm sm:text-base font-semibold">Active Sessions</h3>
                  <div className="rounded-lg border p-2 sm:p-4 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-xs sm:text-sm">Current Session</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Accra, Ghana • Chrome on Mac</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">Last active: Now</p>
                      </div>
                      <span className="text-[10px] sm:text-xs bg-primary/10 text-primary px-2 py-1 rounded whitespace-nowrap flex-shrink-0">Active</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}