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
          glass-surface relative overflow-hidden
          rounded-3xl
          border
          shadow-2xl
        `}>

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
                      ? 'text-[hsl(var(--foreground))]'
                      : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                    }
                  `}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                >
                  {/* Active glass background */}
                  {active && (
                    <div className={`
                      absolute inset-x-1 inset-y-1.5
                      rounded-xl
                      bg-[hsla(0,0%,100%,0.25)]
                      backdrop-blur-md
                      border border-[hsla(0,0%,100%,0.3)]
                      animate-in fade-in zoom-in-95 duration-300
                      shadow-lg
                    `} />
                  )}

                  {/* Icon container */}
                  <div className="relative z-10">
                    <div className={`
                      p-2.5 rounded-xl
                      transition-all duration-300 ease-out
                      ${active
                        ? 'bg-[hsla(0,0%,100%,0.2)] backdrop-blur-sm scale-125 shadow-lg'
                        : 'group-hover:bg-[hsla(0,0%,100%,0.1)] backdrop-blur-sm scale-100'
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
                      bg-[hsla(0,0%,100%,0.4)]
                      backdrop-blur-sm
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