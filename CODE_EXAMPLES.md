# CODE EXAMPLES - READY TO IMPLEMENT
## Copy & Paste Solutions for Mobile Optimization

---

## 📝 INDEX.HTML - VIEWPORT META TAGS

### Current Code
```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

### Updated Code (Replace With This)
```html
<!-- Viewport & Display -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=5" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Desk Support" />

<!-- Theme Colors -->
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />

<!-- Mobile Optimization -->
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-touch-fullscreen" content="yes" />
<meta name="format-detection" content="telephone=no" />
```

---

## 🎨 APP.CSS - SAFE AREA SUPPORT

### Add This to Global CSS
```css
/* Safe Area Support for Notches */
html, body, main {
  width: 100%;
  height: 100%;
}

main {
  padding-left: max(1rem, env(safe-area-inset-left));
  padding-right: max(1rem, env(safe-area-inset-right));
  padding-top: max(0, env(safe-area-inset-top));
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}

/* Fixed positioning safe areas */
.fixed-header {
  padding-top: max(1rem, env(safe-area-inset-top));
}

.fixed-footer {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}

/* iOS Specific Fixes */
@supports (padding: max(0px)) {
  body {
    padding-left: max(12px, env(safe-area-inset-left));
    padding-right: max(12px, env(safe-area-inset-right));
  }
}

/* Prevent unwanted zoom on input focus */
input,
textarea,
select {
  font-size: 16px;
  /* Prevents iOS auto-zoom on focus */
}
```

---

## 📱 RESPONSIVE BUTTON COMPONENT

### Create src/components/ui/ResponsiveButton.tsx
```tsx
import { Button, ButtonProps } from '@/components/ui/button'
import { useIsMobile } from '@/hooks/use-mobile'

interface ResponsiveButtonProps extends ButtonProps {
  isMobileLarge?: boolean
}

export function ResponsiveButton({ 
  isMobileLarge = true, 
  className,
  ...props 
}: ResponsiveButtonProps) {
  const isMobile = useIsMobile()

  // Default sizing: 48px on mobile, 40px on desktop
  const defaultSize = isMobileLarge 
    ? 'h-12 md:h-10 lg:h-10'
    : 'h-10 lg:h-9'

  return (
    <Button
      className={className || defaultSize}
      {...props}
    />
  )
}

// Usage:
// <ResponsiveButton onClick={handleClick}>Click me</ResponsiveButton>
// <ResponsiveButton isMobileLarge={false}>Small</ResponsiveButton>
```

---

## 🎯 RESPONSIVE STAT CARD COMPONENT

### Create src/components/dashboard/ResponsiveStatCard.tsx
```tsx
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import React from 'react'

interface ResponsiveStatCardProps {
  icon: React.ReactNode
  title: string
  value: string | number
  subtitle: string
  badge?: {
    text: string
    variant: 'default' | 'success' | 'warning' | 'error'
  }
  gradient: string
  textColor?: string
}

export function ResponsiveStatCard({
  icon,
  title,
  value,
  subtitle,
  badge,
  gradient,
  textColor = 'text-white'
}: ResponsiveStatCardProps) {
  return (
    <Card className={`relative overflow-hidden border-0 shadow-lg bg-gradient-to-br ${gradient} ${textColor}`}>
      {/* Background blur effect - optimized for mobile */}
      <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-white/5 rounded-full -mr-12 -mt-12 md:-mr-16 md:-mt-16 blur-2xl" />
      
      {/* Content */}
      <div className="relative p-3 sm:p-4 md:p-5 lg:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 md:mb-3 lg:mb-4">
          {/* Icon */}
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <div className="h-5 w-5 md:h-6 md:w-6">{icon}</div>
          </div>
          
          {/* Badge */}
          {badge && (
            <Badge className="text-xs">
              {badge.text}
            </Badge>
          )}
        </div>

        {/* Body */}
        <div className="space-y-1">
          <p className="text-xs md:text-sm font-medium opacity-80">
            {title}
          </p>
          <h3 className="text-2xl md:text-3xl font-bold">
            {value}
          </h3>
          <p className="text-xs opacity-60">
            {subtitle}
          </p>
        </div>
      </div>
    </Card>
  )
}
```

---

## 📊 RESPONSIVE TABLE COMPONENT

### Create src/components/ui/ResponsiveTable.tsx
```tsx
import { useIsMobile } from '@/hooks/use-mobile'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export interface TableColumn {
  key: string
  label: string
  mobileVisible?: boolean
  render?: (value: any, item: any) => React.ReactNode
  align?: 'left' | 'center' | 'right'
}

interface ResponsiveTableProps {
  data: any[]
  columns: TableColumn[]
  onRowClick?: (item: any) => void
  loading?: boolean
}

export function ResponsiveTable({
  data,
  columns,
  onRowClick,
  loading = false
}: ResponsiveTableProps) {
  const isMobile = useIsMobile()

  if (loading) {
    return <div className="text-center py-8">Loading...</div>
  }

  // Mobile: Card View
  if (isMobile) {
    return (
      <div className="space-y-3">
        {data.map((item) => (
          <Card
            key={item.id}
            className="p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onRowClick?.(item)}
          >
            <div className="space-y-2">
              {columns
                .filter(col => col.mobileVisible !== false)
                .map(col => {
                  const value = col.render?.(item[col.key], item) || item[col.key]
                  return (
                    <div key={col.key} className="flex justify-between items-start">
                      <span className="text-xs font-medium text-slate-600">
                        {col.label}
                      </span>
                      <span className={`text-sm font-semibold text-slate-900 text-right ${
                        col.align === 'center' ? 'text-center' : 
                        col.align === 'right' ? 'text-right' : 
                        'text-left'
                      }`}>
                        {value}
                      </span>
                    </div>
                  )
                })}
            </div>
          </Card>
        ))}
      </div>
    )
  }

  // Tablet+: Table View
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {columns.map(col => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-sm font-semibold text-slate-900 ${
                  col.align === 'center' ? 'text-center' :
                  col.align === 'right' ? 'text-right' :
                  'text-left'
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={item.id}
              className="border-b border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
              onClick={() => onRowClick?.(item)}
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  className={`px-4 py-3 text-sm text-slate-900 ${
                    col.align === 'center' ? 'text-center' :
                    col.align === 'right' ? 'text-right' :
                    'text-left'
                  }`}
                >
                  {col.render?.(item[col.key], item) || item[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

---

## 💾 SKELETON LOADING COMPONENT

### Create src/components/ui/Skeleton.tsx
```tsx
import { cn } from '@/lib/utils'

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-slate-200 dark:bg-slate-700', className)}
      {...props}
    />
  )
}

// Stat Card Skeleton
export function StatCardSkeleton() {
  return (
    <div className="relative overflow-hidden border-0 shadow-lg bg-slate-200 dark:bg-slate-700 rounded-xl p-4 md:p-6">
      <div className="space-y-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
  )
}

// Row Skeleton
export function TableRowSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-28" />
    </div>
  )
}

// Usage:
// {loading && <StatCardSkeleton />}
// {!loading && <StatCard ... />}
```

---

## 📱 MOBILE BOTTOM NAVIGATION

### Create src/components/layout/MobileBottomNav.tsx
```tsx
import { useIsMobile } from '@/hooks/use-mobile'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Users,
  Package,
  Ticket,
  MoreHorizontal,
} from 'lucide-react'

export function MobileBottomNav() {
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  if (!isMobile) return null

  const navItems = [
    {
      icon: BarChart3,
      label: 'Dashboard',
      path: '/app/dashboard',
    },
    {
      icon: Users,
      label: 'Users',
      path: '/app/users',
    },
    {
      icon: Package,
      label: 'Assets',
      path: '/app/assets',
    },
    {
      icon: Ticket,
      label: 'Tickets',
      path: '/app/tickets',
    },
    {
      icon: MoreHorizontal,
      label: 'More',
      path: '/app/more',
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-around z-50 pl-[max(0,env(safe-area-inset-left))] pr-[max(0,env(safe-area-inset-right))] pb-[max(0,env(safe-area-inset-bottom))]">
      {navItems.map(item => {
        const isActive = pathname.startsWith(item.path)
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex-1 flex flex-col items-center justify-center h-16 gap-1 transition-colors ${
              isActive
                ? 'text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <item.icon className="h-6 w-6" />
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

// Add to App.tsx layout:
// <div className="flex flex-col min-h-screen pb-16 md:pb-0">
//   <main className="flex-1">...</main>
//   <MobileBottomNav />
// </div>
```

---

## 🔄 RESPONSIVE PERFORMANCE INSIGHTS

### Update AdminDashboard - Performance Insights Section
```tsx
// OLD CODE (4 items in grid)
<div className="grid grid-cols-2 gap-4">
  <div>Asset Utilization...</div>
  <div>Ticket Activity...</div>
  <div>Team Growth...</div>
  <div>Efficiency...</div>
</div>

// NEW CODE (Mobile-optimized)
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
  <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
    <div className="flex items-center gap-2 mb-2">
      <PieChart className="h-4 w-4 text-blue-600" />
      <span className="text-xs font-medium text-slate-600">Asset Utilization</span>
    </div>
    <div className="text-2xl font-bold text-slate-900 mb-1">
      {stats.totalAssets > 0 ? Math.round((stats.assignedAssets / stats.totalAssets) * 100) : 0}%
    </div>
    <div className="text-xs text-slate-500">
      {stats.assignedAssets} of {stats.totalAssets} assets in use
    </div>
  </div>

  <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
    <div className="flex items-center gap-2 mb-2">
      <Activity className="h-4 w-4 text-emerald-600" />
      <span className="text-xs font-medium text-slate-600">Ticket Activity</span>
    </div>
    <div className="text-2xl font-bold text-slate-900 mb-1">{stats.totalTickets}</div>
    <div className="text-xs text-slate-500">
      {stats.inProgressTickets} in progress
    </div>
  </div>

  <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
    <div className="flex items-center gap-2 mb-2">
      <Users className="h-4 w-4 text-purple-600" />
      <span className="text-xs font-medium text-slate-600">Team Growth</span>
    </div>
    <div className="text-2xl font-bold text-slate-900 mb-1">
      {stats.userGrowthPercentage >= 0 ? '+' : ''}{stats.userGrowthPercentage}%
    </div>
    <div className="text-xs text-slate-500">vs last 30 days</div>
  </div>

  <div className="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200">
    <div className="flex items-center gap-2 mb-2">
      <Target className="h-4 w-4 text-amber-600" />
      <span className="text-xs font-medium text-slate-600">Efficiency</span>
    </div>
    <div className="text-2xl font-bold text-slate-900 mb-1">{stats.resolutionRate}%</div>
    <div className="text-xs text-slate-500">Resolution success rate</div>
  </div>
</div>
```

---

## ⚡ LAZY LOADING IMPLEMENTATION

### Update AdminDashboard.tsx
```tsx
import { lazy, Suspense } from 'react'
import { StatCardSkeleton } from '@/components/ui/Skeleton'

// Lazy load heavy components
const ReportsPanel = lazy(() => import('@/components/dashboard/ReportsPanel'))
const AssetsInventory = lazy(() => import('@/components/dashboard/AssetsInventory'))

// Loading fallback
function PanelSkeleton() {
  return (
    <Card className="border-slate-200 shadow-md">
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>
    </Card>
  )
}

// In JSX:
<Suspense fallback={<PanelSkeleton />}>
  <Card className="border-slate-200 shadow-md">
    <div className="p-6 border-b border-slate-200">
      {/* Header */}
    </div>
    <div className="p-6">
      <ReportsPanel noCard />
    </div>
  </Card>
</Suspense>

<Suspense fallback={<PanelSkeleton />}>
  <Card className="border-slate-200 shadow-md">
    <div className="p-6 border-b border-slate-200">
      {/* Header */}
    </div>
    <div className="p-6">
      <AssetsInventory noCard />
    </div>
  </Card>
</Suspense>
```

---

## 🎯 DEBOUNCE REAL-TIME UPDATES

### Update AdminDashboard.tsx
```tsx
import { useMemo } from 'react'
import { debounce } from 'lodash'
import { useIsMobile } from '@/hooks/use-mobile'

export default function AdminDashboard() {
  const isMobile = useIsMobile()
  // ... existing code ...

  // Debounce updates on mobile to save battery
  const debouncedFetchStats = useMemo(
    () => isMobile ? debounce(fetchStats, 2000) : fetchStats,
    [isMobile]
  )

  useEffect(() => {
    // ... existing setup ...

    const channels = [
      supabase.channel('admin_users_changes')
        .on('postgres_changes', { ... }, () => {
          debouncedFetchStats() // Use debounced version
        })
        .subscribe(),
      // ... rest of channels ...
    ]

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel))
      debouncedFetchStats.cancel() // Cancel pending debounced calls on cleanup
    }
  }, [user?.company_id, isMobile])
}
```

---

## 📱 HAPTIC FEEDBACK HOOK

### Create src/hooks/useHaptic.ts
```tsx
import { useCallback } from 'react'

type HapticType = 'light' | 'medium' | 'heavy'

export function useHaptic() {
  const trigger = useCallback((type: HapticType = 'medium') => {
    // Check if device supports vibration API
    if (!window.navigator?.vibrate) return

    // Define vibration patterns (in milliseconds)
    const patterns: Record<HapticType, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: [20, 10, 20], // Pattern: 20ms vibrate, 10ms pause, 20ms vibrate
    }

    try {
      window.navigator.vibrate(patterns[type])
    } catch (error) {
      console.error('Haptic feedback error:', error)
    }
  }, [])

  return { trigger }
}

// Usage in components:
// const { trigger } = useHaptic()
// <Button onClick={() => { trigger('medium'); handleClick() }}>
//   Action
// </Button>
```

---

## 🎯 QUICK FIX FOR STAT CARDS

### AdminDashboard.tsx - Stat Cards Grid (Find and Replace)
```jsx
// FIND THIS:
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">

// REPLACE WITH THIS:
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
```

---

## 🎯 QUICK FIX FOR BUTTONS

### AdminDashboard.tsx - Button Heights (Find and Replace All)
```jsx
// FIND:
<Button className="h-10"
<Button className="h-11"
<Button className="h-auto py-3"

// REPLACE:
<Button className="h-12 md:h-10"
<Button className="h-12 md:h-11"
<Button className="h-12 md:h-10"
```

---

## ✅ VALIDATION SCRIPT

### Copy this to browser console to validate mobile optimization
```javascript
// Check touch target sizes
const checkTouchTargets = () => {
  const buttons = document.querySelectorAll('button, [role="button"]')
  let issues = 0
  buttons.forEach(btn => {
    const rect = btn.getBoundingClientRect()
    if (rect.height < 44 || rect.width < 44) {
      console.warn('Small touch target:', btn, rect)
      issues++
    }
  })
  console.log(`Found ${issues} touch target issues`)
  return issues
}

// Check font sizes
const checkFontSizes = () => {
  const elements = document.querySelectorAll('body *')
  let issues = 0
  elements.forEach(el => {
    const fontSize = window.getComputedStyle(el).fontSize
    const size = parseInt(fontSize)
    if (size < 16 && el.textContent?.length > 10) {
      console.warn('Small font size:', el, fontSize)
      issues++
    }
  })
  console.log(`Found ${issues} font size issues`)
  return issues
}

// Check contrast
const checkContrast = () => {
  console.log('Use WAVE Extension or Lighthouse for contrast checking')
}

// Run checks
console.log('=== MOBILE OPTIMIZATION CHECKS ===')
checkTouchTargets()
checkFontSizes()
checkContrast()
```

---

**Ready to implement?** Start with the quick fixes, then move to component refactoring.  
**Timeline:** 30 min (quick fixes) → 2-3 hours (full implementation) → 1 hour (testing)
