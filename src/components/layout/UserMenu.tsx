import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/context/ThemeContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { User, LogOut } from 'lucide-react'

export function UserMenu() {
  const { user, signOut } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Open account menu"
        >
          <Avatar className={`h-9 w-9 sm:h-10 sm:w-10 ring-2 transition-all backdrop-blur-md ${theme === 'dark' ? 'ring-[hsl(var(--avatar-bg-dark))] hover:ring-[hsl(var(--avatar-bg-darker))]' : 'ring-slate-200 hover:ring-slate-300'}`}>
            <AvatarImage src={user?.avatar_url || undefined} alt="" />
            <AvatarFallback className="text-xs font-semibold sm:text-sm">{user?.full_name?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-[hsl(var(--status-online))] sm:h-3 sm:w-3" aria-label="Online" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 sm:w-64">
        <div className="flex items-center gap-3 p-3">
          <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
            <AvatarImage src={user?.avatar_url || undefined} alt="" />
            <AvatarFallback className="text-sm font-semibold">{user?.full_name?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col space-y-1">
            <p className="truncate text-xs font-semibold sm:text-sm">{user?.full_name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
            <Badge variant="secondary" className="w-fit text-xs capitalize">{user?.role}</Badge>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/app/profile')} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" aria-hidden="true" />
          Profile Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
