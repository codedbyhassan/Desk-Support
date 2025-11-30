import { useState, useMemo } from 'react'
import { useNotifications } from '@/context/NotificationContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Search,
  FileText,
  MessageSquare,
  Users,
  Package,
  Activity,
  ArrowLeft,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function NotificationsPage() {
  const navigate = useNavigate()
  const {
    notifications,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
  } = useNotifications()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'read'>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  // Filter and search notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      // Status filter
      if (filterType === 'unread' && n.read) return false
      if (filterType === 'read' && !n.read) return false

      // Category filter
      if (filterCategory !== 'all' && n.type !== filterCategory) return false

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase()
        return (
          n.title.toLowerCase().includes(search) ||
          n.message.toLowerCase().includes(search)
        )
      }

      return true
    })
  }, [notifications, searchTerm, filterType, filterCategory])

  const unreadCount = notifications.filter(n => !n.read).length
  const readCount = notifications.filter(n => n.read).length

  const getNotificationIcon = (type: string) => {
    const iconClass = 'h-5 w-5'
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

  const getNotificationTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      ticket_assigned: 'Ticket Assigned',
      ticket_commented: 'Ticket Commented',
      ticket_status_changed: 'Ticket Status',
      team_message: 'Team Message',
      asset_assigned: 'Asset Assigned',
      asset_updated: 'Asset Updated',
      department_ticket: 'Department Ticket',
    }
    return typeMap[type] || 'Notification'
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

  const handleNotificationClick = (notification: any) => {
    if (!notification.read) {
      markAsRead(notification.id)
    }

    // Generate link based on entity type
    let link: string | null = null
    if (notification.entity_type && notification.entity_id) {
      switch (notification.entity_type) {
        case 'ticket':
          link = `/app/tickets/${notification.entity_id}`
          break
        case 'team':
          link = `/app/teams/${notification.entity_id}`
          break
        case 'asset':
          link = `/app/assets/${notification.entity_id}`
          break
        case 'department':
          link = `/app/departments/${notification.entity_id}`
          break
      }
    }

    if (link) {
      navigate(link)
    }
  }

  const notificationTypes = Array.from(
    new Set(notifications.map(n => n.type))
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/app')}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              className="pl-9 bg-muted border-0 h-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-6">
        {/* Filters & Actions */}
        <div className="mb-6 space-y-4">
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
            >
              All ({notifications.length})
            </Button>
            <Button
              variant={filterType === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('unread')}
            >
              Unread ({unreadCount})
            </Button>
            <Button
              variant={filterType === 'read' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('read')}
            >
              Read ({readCount})
            </Button>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterCategory('all')}
            >
              All Types
            </Button>
            {notificationTypes.map(type => (
              <Button
                key={type}
                variant={filterCategory === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterCategory(type)}
              >
                {getNotificationTypeLabel(type)}
              </Button>
            ))}
          </div>

          {/* Action Buttons */}
          {notifications.length > 0 && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={markAllAsRead}
                disabled={unreadCount === 0}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={deleteAllRead}
                disabled={readCount === 0}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear read
              </Button>
            </div>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-2">
          {loading ? (
            <Card className="p-8 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="h-10 w-10 border-4 border-muted rounded-full" />
                  <div className="absolute top-0 left-0 h-10 w-10 border-4 border-transparent border-t-primary rounded-full animate-spin" />
                </div>
                <p className="text-sm text-muted-foreground">Loading notifications...</p>
              </div>
            </Card>
          ) : filteredNotifications.length === 0 ? (
            <Card className="p-8 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3 text-center">
                <Bell className="h-12 w-12 text-muted-foreground/50" />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">
                    {searchTerm ? 'No notifications found' : 'All caught up!'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {searchTerm
                      ? 'Try a different search'
                      : 'You have no notifications at the moment'}
                  </p>
                </div>
              </div>
            </Card>
          ) : (
            filteredNotifications.map((notification, index) => (
              <div key={notification.id}>
                <Card
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    !notification.read
                      ? 'bg-primary/5 border-l-4 border-l-primary'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-foreground text-sm sm:text-base">
                          {notification.title}
                        </h3>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!notification.read && (
                            <Badge variant="default" className="text-[10px]">
                              New
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="text-xs"
                        >
                          {getNotificationTypeLabel(notification.type)}
                        </Badge>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-green-100 dark:hover:bg-green-900/20 hover:text-green-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(notification.id)
                          }}
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900/20 text-muted-foreground hover:text-red-600"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(notification.id)
                        }}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>

                {index < filteredNotifications.length - 1 && <Separator className="my-2" />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
