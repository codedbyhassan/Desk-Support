import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '@/context/ThemeContext'
import { NavItem } from './types'

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
    <aside className="hidden lg:block fixed left-0 top-0 h-screen z-50">
      <div 
        className={`relative h-full w-16 flex flex-col items-center py-6 gap-2 transition-colors duration-300 ${
          theme === 'dark' 
            ? 'bg-gradient-to-b from-[#0d1117] via-[#0d1117] to-[#0d1117] border-r border-[#151a1f]' 
            : `bg-gradient-to-b from-[${primaryColor}] to-[${lightenColor(primaryColor, -10)}] border-r border-white/20`
        }`}
        style={theme === 'light' ? {
          background: `linear-gradient(to bottom, ${primaryColor}, ${lightenColor(primaryColor, -10)})`,
        } : undefined}
      >
        {/* Navigation Icons */}
        <div className="flex flex-col items-center gap-2 w-full flex-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            const isSettings = item.id === 'settings' || item.name?.toLowerCase() === 'settings'
            return (
              <button
                key={item.id}
                onClick={() => handleNavChange(item.href)}
                className={`relative w-10 h-10 rounded-full transition-all duration-300 flex items-center justify-center group ${
                  isSettings ? 'mt-auto' : ''
                } ${
                  theme === 'dark'
                    ? isActive 
                      ? 'bg-white border-2 border-white shadow-lg' 
                      : 'bg-transparent hover:bg-[#151a1f] border border-transparent hover:border-[#151a1f]'
                    : isActive 
                      ? 'bg-white shadow-md' 
                      : 'bg-white/15 hover:bg-white/25'
                }`}
                title={item.name}
              >
                <Icon 
                  size={18} 
                  className={`transition-colors ${
                    theme === 'dark'
                      ? isActive ? 'text-black' : 'text-white/70 group-hover:text-white'
                      : isActive ? 'text-slate-800' : 'text-white'
                  }`}
                  style={theme === 'light' && isActive ? { color: primaryColor } : undefined}
                />
                {item.badge && (
                  <span 
                    className="absolute -top-2 -right-2 flex items-center justify-center min-w-[20px] h-[20px] px-0.5 text-[10px] font-bold rounded-full text-white"
                    style={{ 
                      backgroundColor: theme === 'dark' 
                        ? (isActive ? '#ef4444' : '#ef4444')
                        : (isActive ? primaryColor : '#ef4444')
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </aside>
  )
}