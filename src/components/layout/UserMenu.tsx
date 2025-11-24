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
        <button className="relative hidden lg:block">
          <Avatar className={`h-10 w-10 ring-2 transition-all backdrop-blur-md ${
            theme === 'dark' 
              ? 'ring-[#854F6C] hover:ring-[#522B5B]' 
              : 'ring-slate-200 hover:ring-slate-300'
          }`}>
            <AvatarImage src={user?.avatar_url || undefined} />
            <AvatarFallback 
              className={`text-sm font-semibold ${theme === 'dark' ? 'text-[#FBE4D8]' : 'text-white'}`}
              style={{ backgroundColor: theme === 'dark' ? '#522B5B' : primaryColor }}
            >
              {user?.full_name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className={`absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 ${theme === 'dark' ? 'border-[#2B124C]' : 'border-white'}`} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex items-center gap-3 p-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user?.avatar_url || undefined} />
            <AvatarFallback 
              className={theme === 'dark' ? 'text-[#FBE4D8]' : 'text-white'}
              style={{ backgroundColor: theme === 'dark' ? '#522B5B' : primaryColor }}
            >
              {user?.full_name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-1 flex-1">
            <p className="font-semibold text-sm">{user?.full_name}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <Badge variant="secondary" className="w-fit text-xs">
              {user?.role}
            </Badge>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/app/profile')} className="cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          Profile Settings
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

