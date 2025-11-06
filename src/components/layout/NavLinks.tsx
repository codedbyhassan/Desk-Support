import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { NavLinksProps } from './types'

export const NavLinks = ({ items, pathname }: NavLinksProps) => (
  <div className="space-y-1">
    {items.map((item, index) => {
      const isActive = pathname === item.href
      const gradient = index % 2 === 0 ? 'from-orange-500 to-red-500' : 'from-orange-600 to-red-600'
      
      return (
        <Link
          key={item.name}
          to={item.href}
          className={cn(
            'group flex items-center gap-x-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150 ease-in-out',
            isActive 
              ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30'
              : 'text-gray-600 hover:text-gray-900 hover:bg-orange-50'
          )}
        >
          <div className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150',
            isActive 
              ? 'bg-white/20'
              : `bg-gradient-to-br ${gradient} opacity-80 group-hover:opacity-100`
          )}>
            <item.icon className={cn(
              'h-4 w-4 shrink-0',
              isActive ? 'text-white' : 'text-white'
            )} aria-hidden="true" />
          </div>
          <span>{item.name}</span>
          {item.badge && (
            <Badge 
              variant={isActive ? "secondary" : "outline"} 
              className={cn(
                "ml-auto",
                isActive ? 'bg-white/20 text-white' : 'text-orange-600 border-orange-200 bg-orange-50'
              )}
            >
              {item.badge}
            </Badge>
          )}
        </Link>
      )
    })}
  </div>
)