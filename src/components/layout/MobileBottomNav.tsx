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
    // Exact match for most routes
    if (pathname === href) return true
    
    // Special handling for routes with sub-pages
    // Allow /app/teams/... to match /app/teams
    // Allow /app/departments/... to match /app/departments
    // Allow /app/working-area/... to match /app/working-area
    if (href === '/app/teams' || href === '/app/departments' || href === '/app/working-area') {
      return pathname.startsWith(href + '/')
    }
    
    return false
  }

  return (
    <>
      {/* Spacer to prevent content from being hidden behind nav */}
      <div className="h-24 lg:hidden" aria-hidden="true" />

      {/* Mobile Bottom Navigation - Only visible on mobile */}
      <nav 
        className="fixed bottom-0 left-0 right-0 lg:hidden z-50 px-3 pb-3 sm:px-4 sm:pb-4"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className={`
          relative overflow-hidden
          rounded-3xl
          ${theme === 'dark' 
            ? 'bg-gradient-to-br from-indigo-950/80 via-purple-900/80 to-violet-950/80 border-indigo-800/40' 
            : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-violet-50 border-indigo-200/60'
          }
          border
          shadow-2xl ${theme === 'dark' ? 'shadow-purple-900/30' : 'shadow-purple-200/40'}
          backdrop-blur-2xl
        `}>
          {/* Premium gradient overlay */}
          <div className={`
            absolute inset-0 
            ${theme === 'dark'
              ? 'bg-gradient-to-t from-purple-900/40 via-indigo-900/20 to-transparent'
              : 'bg-gradient-to-t from-purple-200/30 via-indigo-100/20 to-transparent'
            }
            pointer-events-none
          `} />

          {/* Accent glow effect */}
          <div className={`
            absolute -top-12 -right-12 w-24 h-24
            ${theme === 'dark'
              ? 'bg-purple-500/20'
              : 'bg-purple-300/30'
            }
            rounded-full blur-3xl
            pointer-events-none
          `} />
          <div className={`
            absolute -bottom-8 -left-8 w-20 h-20
            ${theme === 'dark'
              ? 'bg-indigo-500/20'
              : 'bg-indigo-300/30'
            }
            rounded-full blur-3xl
            pointer-events-none
          `} />

          <div className="relative flex items-center justify-around h-20 px-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.href)
              
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.href)}
                  className={`
                    relative flex flex-col items-center justify-center gap-1.5
                    flex-1 h-full py-2 px-1
                    rounded-2xl
                    transition-all duration-300 ease-out
                    active:scale-90
                    group
                    ${active
                      ? 'text-white'
                      : theme === 'dark'
                      ? 'text-indigo-300 hover:text-purple-200'
                      : 'text-indigo-600 hover:text-purple-700'
                    }
                  `}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                >
                  {/* Active gradient background */}
                  {active && (
                    <div className={`
                      absolute inset-x-1 inset-y-1.5
                      rounded-xl
                      ${theme === 'dark'
                        ? 'bg-gradient-to-br from-purple-600/60 via-indigo-600/50 to-violet-600/60'
                        : 'bg-gradient-to-br from-purple-500/70 via-indigo-500/60 to-violet-500/70'
                      }
                      animate-in fade-in zoom-in-95 duration-300
                      group-hover:shadow-lg group-hover:shadow-purple-500/30
                    `} />
                  )}

                  {/* Icon container */}
                  <div className="relative z-10">
                    <div className={`
                      p-2.5 rounded-xl
                      transition-all duration-300 ease-out
                      ${active
                        ? theme === 'dark'
                          ? 'bg-white/15 scale-125 shadow-lg shadow-purple-400/30'
                          : 'bg-white/40 scale-125 shadow-lg shadow-purple-400/40'
                        : theme === 'dark'
                        ? 'group-hover:bg-purple-500/20 scale-100'
                        : 'group-hover:bg-purple-200/40 scale-100'
                      }
                    `}>
                      <Icon 
                        className={`
                          h-5 w-5 sm:h-6 sm:w-6
                          transition-transform duration-300 ease-out
                          ${active ? 'scale-125' : 'group-hover:scale-110'}
                        `}
                        strokeWidth={active ? 2.5 : 2}
                      />
                    </div>
                  </div>

                  {/* Label */}
                  <span className={`
                    relative z-10
                    text-[9px] sm:text-[10px] font-semibold leading-none
                    transition-all duration-300
                    ${active
                      ? 'opacity-100 translate-y-0 drop-shadow-md'
                      : 'opacity-70 group-hover:opacity-100'
                    }
                  `}>
                    {item.label}
                  </span>

                  {/* Active pulse indicator */}
                  {active && (
                    <div className={`
                      absolute bottom-0.5 h-1 w-6
                      rounded-full
                      ${theme === 'dark'
                        ? 'bg-gradient-to-r from-purple-400 via-indigo-300 to-violet-400'
                        : 'bg-gradient-to-r from-purple-600 via-indigo-500 to-violet-600'
                      }
                      animate-pulse
                    `} />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </nav>
    </>
  )
}