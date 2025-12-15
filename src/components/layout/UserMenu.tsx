import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { useTheme } from '@/context/ThemeContext'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { User, LogOut } from 'lucide-react'

interface UserMenuProps {
  primaryColor: string
}

export function UserMenu({ primaryColor }: UserMenuProps) {
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
        <button className="relative">
          <Avatar className={`h-9 w-9 sm:h-10 sm:w-10 ring-2 transition-all backdrop-blur-md ${
            theme === 'dark' 
              ? 'ring-[hsl(var(--avatar-bg-dark))] hover:ring-[hsl(var(--avatar-bg-darker))]' 
              : 'ring-slate-200 hover:ring-slate-300'
          }`}>
            <AvatarImage src={user?.avatar_url || undefined} />
            <AvatarFallback className="text-xs sm:text-sm font-semibold text-[hsl(var(--foreground))] bg-[hsla(0,0%,100%,0.15)] backdrop-blur-sm border border-[hsla(0,0%,100%,0.2)]">
              {user?.full_name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-[hsl(var(--status-online))] rounded-full border-2 ${theme === 'dark' ? 'border-[hsl(var(--status-online-border))]' : 'border-white'}`} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 sm:w-64">
        <div className="flex items-center gap-3 p-3">
          <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
            <AvatarImage src={user?.avatar_url || undefined} />
            <AvatarFallback className="text-[hsl(var(--foreground))] bg-[hsla(0,0%,100%,0.15)] backdrop-blur-sm border border-[hsla(0,0%,100%,0.2)]">
              {user?.full_name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-1 flex-1 min-w-0">
            <p className="font-semibold text-xs sm:text-sm truncate">{user?.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            <Badge variant="secondary" className="w-fit text-xs">
              {user?.role}
            </Badge>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/app/profile')} className="cursor-pointer">
          <User className="mr-2 h-4 w-4 text-foreground" />
          <span className="text-foreground">Profile Settings</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
          <LogOut className="mr-2 h-4 w-4 text-destructive" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

