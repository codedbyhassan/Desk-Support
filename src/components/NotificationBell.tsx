// src/components/NotificationBell.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications, type AppNotification } from '@/context/NotificationContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  FileText,
  MessageSquare,
  Users,
  Package,
  Activity,
} from 'lucide-react'

// ✅ Helper function to generate navigation links from notification data
const generateNotificationLink = (entityType?: string | null, entityId?: string | null): string | undefined => {
  if (!entityType || !entityId) return undefined
  
  switch (entityType) {
    case 'ticket':
      return `/app/tickets/${entityId}`
    case 'team':
      return `/app/teams/${entityId}`
    case 'asset':
      return `/app/assets/${entityId}`
    case 'department':
      return `/app/departments/${entityId}`
    default:
      return undefined
  }
}

export function NotificationBell() {
  const navigate = useNavigate()
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
  } = useNotifications()

  const [isOpen, setIsOpen] = useState(false)
  const [prevUnreadCount, setPrevUnreadCount] = useState(unreadCount)
  const [shouldPulse, setShouldPulse] = useState(false)

  // Trigger pulse animation when unread count increases
  useEffect(() => {
    if (unreadCount > prevUnreadCount) {
      setShouldPulse(true)
      setTimeout(() => setShouldPulse(false), 1000)
    }
    setPrevUnreadCount(unreadCount)
  }, [unreadCount])

  const handleNotificationClick = async (notification: AppNotification) => {
    // Mark as read if not already read
    if (!notification.read) {
      try {
        await markAsRead(notification.id)
      } catch (error) {
        console.error('Error marking notification as read:', error)
      }
    }

    // Generate link using the helper function
    const link = notification.link || generateNotificationLink(notification.entity_type, notification.entity_id)

    if (link) {
      console.log('🔗 Navigating to:', link, 'from notification:', notification.title)
      navigate(link)
      setIsOpen(false)
    } else {
      console.warn('⚠️ No link available for notification:', {
        id: notification.id,
        type: notification.type,
        entity_type: notification.entity_type,
        entity_id: notification.entity_id,
      })
    }
  }

  const getNotificationIcon = (type: string) => {
    const iconClass = "h-4 w-4"
    switch (type) {
      case 'ticket_assigned':
      case 'ticket_status_changed':
        return <FileText className={`${iconClass} text-blue-500`} />
      case 'ticket_commented':
        return <MessageSquare className={`${iconClass} text-green-500`} />
      case 'team_message':
        return <Users className={`${iconClass} text-purple-500`} />
      case 'asset_assigned':
      case 'asset_updated':
        return <Package className={`${iconClass} text-amber-500`} />
      case 'department_ticket':
        return <Activity className={`${iconClass} text-orange-500`} />
      default:
        return <Bell className={`${iconClass} text-gray-500`} />
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`relative transition-all duration-200 ${shouldPulse ? 'bell-shake' : ''}`}
        >
          <Bell className={`h-5 w-5 ${unreadCount > 0 ? 'text-orange-500' : ''}`} />
          
          {/* Badge Count with Animation */}
          {unreadCount > 0 && (
            <span className={`
              absolute -top-1 -right-1 
              h-5 min-w-[20px] px-1
              rounded-full 
              bg-gradient-to-r from-red-500 to-rose-500
              text-white text-[10px] font-bold
              flex items-center justify-center
              shadow-lg shadow-red-500/50
              ${shouldPulse ? 'badge-pulse' : ''}
              ring-2 ring-white dark:ring-gray-900
            `}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-full max-w-xs sm:max-w-sm p-0">
        {/* Header */}
        <div className="p-2 sm:p-4 border-b bg-gradient-to-r from-orange-500 via-orange-400 to-amber-500">
          <div className="flex items-center justify-between mb-1 sm:mb-3">
            <h3 className="font-bold text-sm sm:text-base flex items-center gap-1 sm:gap-2 text-white">
              <Bell className="h-4 sm:h-5 w-4 sm:w-5" />
              <span className="hidden sm:inline">Notifications</span>
              <span className="sm:hidden">Notif</span>
              {unreadCount > 0 && (
                <span className="bg-white/20 backdrop-blur-sm px-1.5 sm:px-2 py-0 sm:py-0.5 rounded-full text-[10px] sm:text-xs font-semibold">
                  {unreadCount}
                </span>
              )}
            </h3>
          </div>

          {/* Action Buttons */}
          {notifications.length > 0 && (
            <div className="flex gap-1 sm:gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
                className="flex-1 text-[10px] sm:text-xs bg-white/90 hover:bg-white text-orange-600 font-semibold px-1 sm:px-2 py-1 h-7 sm:h-8"
              >
                <CheckCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">Mark all read</span>
                <span className="sm:hidden">Read</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={deleteAllRead}
                disabled={notifications.filter((n: AppNotification) => n.read).length === 0}
                className="flex-1 text-[10px] sm:text-xs bg-white/90 hover:bg-white text-orange-600 font-semibold px-1 sm:px-2 py-1 h-7 sm:h-8"
              >
                <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                <span className="hidden sm:inline">Clear read</span>
                <span className="sm:hidden">Clear</span>
              </Button>
            </div>
          )}
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto max-h-[280px] sm:max-h-[480px] bg-gray-50/50 dark:bg-gray-900/50">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="relative">
                <div className="h-10 w-10 border-4 border-orange-200 dark:border-orange-900 rounded-full" />
                <div className="absolute top-0 left-0 h-10 w-10 border-4 border-transparent border-t-orange-500 rounded-full animate-spin" />
              </div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="h-20 w-20 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 flex items-center justify-center mb-4">
                <Bell className="h-10 w-10 text-orange-300 dark:text-orange-700" />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-semibold mb-1">All caught up!</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                No new notifications at the moment
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((notification: AppNotification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`
                    p-4 hover:bg-white dark:hover:bg-gray-800 
                    cursor-pointer transition-all duration-200
                    border-b border-gray-100 dark:border-gray-800
                    relative group
                    ${!notification.read ? 'bg-orange-50/80 dark:bg-orange-900/10' : 'bg-white dark:bg-gray-900'}
                  `}
                >
                  {/* Unread Indicator */}
                  {!notification.read && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-orange-500 to-amber-500" />
                  )}

                  <div className="flex items-start gap-2 sm:gap-3 ml-1 sm:ml-2">
                    {/* Icon */}
                    <div className={`
                      h-8 sm:h-10 w-8 sm:w-10 rounded-lg sm:rounded-xl
                      bg-gradient-to-br from-gray-100 to-gray-200 
                      dark:from-gray-800 dark:to-gray-700 
                      flex items-center justify-center flex-shrink-0
                      shadow-sm
                      group-hover:scale-110 transition-transform duration-200
                    `}>
                      <div className="h-3 w-3 sm:h-4 sm:w-4">
                        {getNotificationIcon(notification.type)}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-xs sm:text-sm mb-0.5 sm:mb-1 ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {notification.title}
                      </p>
                      <p className="text-[10px] sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-1 sm:line-clamp-2 leading-tight">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-1 sm:gap-2 mt-1">
                        <span className="text-[9px] sm:text-xs text-gray-500 dark:text-gray-500">
                          {formatTimeAgo(notification.created_at)}
                        </span>
                        {!notification.read && (
                          <Badge variant="default" className="text-[8px] sm:text-[10px] py-0 px-1 sm:px-1.5 bg-orange-500 hover:bg-orange-600">
                            New
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions - Only visible on hover (desktop) or always clickable on mobile */}
                    <div className="hidden sm:flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-green-100 dark:hover:bg-green-900/20 hover:text-green-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(notification.id)
                          }}
                          title="Mark as read"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(notification.id)
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2 sm:p-3 text-center bg-white dark:bg-gray-900">
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] sm:text-xs text-orange-600 hover:text-orange-700 font-semibold hover:bg-orange-50 py-1 h-auto"
                onClick={() => {
                  navigate('/app/notifications')
                  setIsOpen(false)
                }}
              >
                <span className="hidden sm:inline">View all notifications →</span>
                <span className="sm:hidden">View all</span>
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>

      {/* Animations */}
      <style>{`
        @keyframes badgePulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
        }

        @keyframes bellShake {
          0%, 100% { transform: rotate(0deg); }
          10%, 30%, 50%, 70%, 90% { transform: rotate(-10deg); }
          20%, 40%, 60%, 80% { transform: rotate(10deg); }
        }

        .badge-pulse {
          animation: badgePulse 0.5s ease-in-out;
        }

        .bell-shake {
          animation: bellShake 0.5s ease-in-out;
        }
      `}</style>
    </DropdownMenu>
  )
}