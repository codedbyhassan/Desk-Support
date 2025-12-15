import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '@/context/ThemeContext'
import { NavItem } from './types'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface SidebarProps {
  navItems: NavItem[]
  primaryColor: string
}

export function Sidebar({ navItems, primaryColor }: SidebarProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { theme } = useTheme()

  const lightenColor = (color: string, percent: number): string => {
    const num = parseInt(color.replace("#", ""), 16)
    const amt = Math.round(2.55 * percent)
    const R = (num >> 16) + amt
    const G = (num >> 8 & 0x00FF) + amt
    const B = (num & 0x0000FF) + amt
    return "#" + (
      0x1000000 +
      (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
      (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
      (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1)
  }

  const handleNavChange = (href: string) => {
    navigate(href)
  }

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="hidden lg:block fixed left-0 top-0 h-screen z-50">
        <div className="glass-sidebar relative h-full w-16 flex flex-col items-center py-6 gap-2 transition-colors duration-300 overflow-hidden">
          {/* Light mode gradient */}
          <div className="dark:hidden absolute inset-0" style={{ background: 'var(--bg-gradient-sidebar)' }} />
          {/* Dark mode gradient */}
          <div className="hidden dark:block absolute inset-0" style={{ background: 'var(--bg-gradient-sidebar-dark, linear-gradient(180deg, hsl(var(--primary-900)) 0%, hsl(var(--primary-950)) 50%, hsl(var(--secondary-900)) 100%))' }} />
          {/* Subtle radial gradient for depth */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-30" style={{ background: `radial-gradient(circle, hsl(var(--primary-200)) 0%, transparent 70%)` }} />
          {/* Content with relative z-index */}
          <div className="relative z-10 w-full h-full flex flex-col items-center py-6 gap-2">
            {/* Navigation Icons */}
            <div className="flex flex-col items-center gap-2 w-full flex-1">
              {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              const isSettings = item.id === 'settings' || item.name?.toLowerCase() === 'settings'
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleNavChange(item.href)}
                      className={`relative w-10 h-10 rounded-full transition-all duration-300 flex items-center justify-center group ${
                        isSettings ? 'mt-auto' : ''
                      } ${
                        isActive 
                          ? 'bg-[hsl(var(--primary))]/20 border-2 border-[hsl(var(--primary))]/40 shadow-lg backdrop-blur-sm' 
                          : 'bg-transparent hover:bg-[hsl(var(--primary))]/10 border border-transparent hover:border-[hsl(var(--primary))]/20 backdrop-blur-sm'
                      }`}
                      aria-label={item.name}
                    >
                      <Icon 
                        size={18} 
                        className={`transition-colors ${
                          isActive 
                            ? 'text-[hsl(var(--primary))]' 
                            : 'text-[hsl(var(--foreground))]/70 group-hover:text-[hsl(var(--primary))]'
                        }`}
                      />
                      {item.badge && (
                        <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[20px] h-[20px] px-0.5 text-[10px] font-bold rounded-full bg-[hsl(var(--primary))]/30 backdrop-blur-sm border border-[hsl(var(--primary))]/40 text-[hsl(var(--primary-foreground))]">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="ml-2">
                    <p>{item.name}</p>
                  </TooltipContent>
                </Tooltip>
              )
              })}
            </div>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}