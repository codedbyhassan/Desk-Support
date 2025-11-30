import { useNavigate, useLocation } from 'react-router-dom'
import { useTheme } from '@/context/ThemeContext'
import {
  BarChart3,
  Building2,
  Users2,
  FileBox,
  User,
} from 'lucide-react'

export function MobileBottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { theme } = useTheme()

  // Hide navbar on Teams page
  const isTeamsPage = pathname.startsWith('/app/teams')
  
  if (isTeamsPage) {
    return null
  }

  const navItems = [
    {
      id: 'overview',
      label: 'Overview',
      icon: BarChart3,
      href: '/app/dashboard',
    },
    {
      id: 'department',
      label: 'Department',
      icon: Building2,
      href: '/app/departments',
    },
    {
      id: 'teams',
      label: 'Teams',
      icon: Users2,
      href: '/app/teams',
    },
    {
      id: 'files',
      label: 'Files',
      icon: FileBox,
      href: '/app/working-area',
    },
    {
      id: 'users',
      label: 'Users',
      icon: User,
      href: '/app/users',
    },
  ]

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile Bottom Navigation - Only visible on mobile */}
      <nav className="fixed bottom-4 left-4 right-4 lg:hidden z-50 bg-white dark:bg-white rounded-3xl shadow-2xl dark:shadow-black/50 border border-slate-100 dark:border-slate-200/30 backdrop-blur-2xl">
        <div className="flex items-center justify-around h-20 px-2 max-w-full">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.href)}
                className={`flex flex-col items-center justify-center gap-0 flex-1 h-full py-3 px-2 transition-all duration-300 active:scale-95 relative group rounded-2xl ${
                  active
                    ? theme === 'dark'
                      ? 'text-slate-900'
                      : 'text-blue-600'
                    : theme === 'dark'
                    ? 'text-slate-700 hover:text-slate-900'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {/* Active background pill */}
                {active && (
                  <div className={`absolute inset-1 rounded-2xl ${
                    theme === 'dark'
                      ? 'bg-gray-100/40'
                      : 'bg-gradient-to-br from-blue-50 to-blue-100/70'
                  }`} />
                )}
                
                {/* Icon container */}
                <div className={`relative z-10 p-2.5 rounded-xl transition-all duration-300 ${
                  active
                    ? theme === 'dark'
                      ? 'bg-gray-200/80 scale-110'
                      : 'bg-blue-100/80 scale-110'
                    : theme === 'dark'
                    ? 'bg-gray-100/50 group-hover:bg-gray-150'
                    : 'bg-slate-100/50 group-hover:bg-slate-150'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
              </button>
            )
          })}
        </div>
      </nav>
    </>
  )
}
