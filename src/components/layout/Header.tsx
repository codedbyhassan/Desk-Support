import { useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '@/context/ThemeContext'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { NotificationBell } from '@/components/NotificationBell'
import { Sun, Moon, BarChart3, ChevronRight, QrCode } from 'lucide-react'
import { MobileMenu } from './MobileMenu'
import { UserMenu } from './UserMenu'
import { NavItem } from './types'

interface HeaderProps { navItems: NavItem[]; mobileMenuOpen: boolean; setMobileMenuOpen: (open:boolean)=>void; primaryColor:string }

export function Header({ navItems, mobileMenuOpen, setMobileMenuOpen, primaryColor }: HeaderProps) {
  const { user }=useAuth(); const { theme,toggleTheme }=useTheme(); const { pathname }=useLocation(); const navigate=useNavigate()
  const currentPage=navItems.find(item=>pathname===item.href || pathname.startsWith(`${item.href}/`))
  return <><header className="glass-header fixed top-0 right-0 left-0 z-40 h-14 lg:h-16 overflow-hidden"><div className="dark:hidden absolute inset-0" style={{background:'var(--bg-gradient-header)'}}/><div className="hidden dark:block absolute inset-0" style={{background:'var(--bg-gradient-header-dark, linear-gradient(90deg, hsl(var(--primary-900)) 0%, hsl(var(--secondary-900)) 50%, hsl(var(--primary-900)) 100%)'}}/><div className="flex h-full relative z-10"><div className="hidden lg:block w-16 flex-shrink-0"/><div className="flex-1 px-4 lg:px-8 py-3 lg:py-4"><div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3 min-w-0"><MobileMenu navItems={navItems} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} primaryColor={primaryColor} hidden={true}/><div className="hidden lg:flex items-center gap-2"><div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[hsla(0,0%,100%,0.15)] backdrop-blur-sm border border-[hsla(0,0%,100%,0.2)]"><BarChart3 className="h-5 w-5 text-foreground"/></div><div className="flex items-center gap-2"><h1 className="text-lg font-semibold text-foreground">{currentPage?.name||'Dashboard'}</h1>{currentPage?.description&&<><ChevronRight className="h-4 w-4 text-muted-foreground"/><p className="text-sm text-muted-foreground">{currentPage.description}</p></>}</div></div><div className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[hsla(0,0%,100%,0.15)] backdrop-blur-sm border border-[hsla(0,0%,100%,0.2)]"><BarChart3 className="h-4 w-4 text-foreground"/></div><div className="lg:hidden min-w-0"><h2 className="text-base font-semibold truncate text-foreground">{currentPage?.name||'Dashboard'}</h2></div></div><div className="flex items-center gap-1 sm:gap-2"><Button variant="ghost" size="icon" onClick={()=>navigate('/app/qr-scanner')} className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg lg:hidden hover:bg-muted" title="QR Code Attendance"><QrCode className="h-4 w-4 sm:h-5 sm:w-5"/></Button><NotificationBell/><Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg hover:bg-muted" title={theme==='dark'?'Light mode':'Dark mode'}>{theme==='dark'?<Sun className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500"/>:<Moon className="h-4 w-4 sm:h-5 sm:w-5"/>}</Button><UserMenu primaryColor={primaryColor}/></div></div></div></div></header><div className="h-20 lg:h-16"/></>
}
