// src/components/ToastNotification.tsx
import { useEffect, useState } from 'react'
import { X, Bell, FileText, MessageSquare, Users, Package, Activity, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: string
  title: string
  message: string
  type: ToastType
  notificationType?: string
  onClick?: () => void
  duration?: number
}

interface ToastNotificationProps {
  toast: Toast
  onDismiss: (id: string) => void
}

export function ToastNotification({ toast, onDismiss }: ToastNotificationProps) {
  const [isExiting, setIsExiting] = useState(false)
  const [progress, setProgress] = useState(100)
  const [isHovered, setIsHovered] = useState(false)

  const duration = toast.duration || 5000

  useEffect(() => {
    if (isHovered) return

    // Progress bar animation
    const startTime = Date.now()
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)
      
      if (remaining === 0) {
        clearInterval(progressInterval)
      }
    }, 50)

    // Auto dismiss
    const timer = setTimeout(() => {
      handleDismiss()
    }, duration)

    return () => {
      clearTimeout(timer)
      clearInterval(progressInterval)
    }
  }, [duration, isHovered])

  const handleDismiss = () => {
    setIsExiting(true)
    setTimeout(() => {
      onDismiss(toast.id)
    }, 300)
  }

  const handleClick = () => {
    if (toast.onClick) {
      toast.onClick()
      handleDismiss()
    }
  }

  const getTypeStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          container: 'bg-white dark:bg-slate-900 border-l-4 border-emerald-500',
          iconContainer: 'bg-emerald-50 dark:bg-emerald-950/50',
          icon: 'text-emerald-600 dark:text-emerald-400',
          title: 'text-slate-900 dark:text-slate-100',
          message: 'text-slate-600 dark:text-slate-400',
          progress: 'bg-emerald-500 dark:bg-emerald-600',
          progressBg: 'bg-emerald-100 dark:bg-emerald-950/30',
          StatusIcon: CheckCircle2,
        }
      case 'warning':
        return {
          container: 'bg-white dark:bg-slate-900 border-l-4 border-amber-500',
          iconContainer: 'bg-amber-50 dark:bg-amber-950/50',
          icon: 'text-amber-600 dark:text-amber-400',
          title: 'text-slate-900 dark:text-slate-100',
          message: 'text-slate-600 dark:text-slate-400',
          progress: 'bg-amber-500 dark:bg-amber-600',
          progressBg: 'bg-amber-100 dark:bg-amber-950/30',
          StatusIcon: AlertTriangle,
        }
      case 'error':
        return {
          container: 'bg-white dark:bg-slate-900 border-l-4 border-red-500',
          iconContainer: 'bg-red-50 dark:bg-red-950/50',
          icon: 'text-red-600 dark:text-red-400',
          title: 'text-slate-900 dark:text-slate-100',
          message: 'text-slate-600 dark:text-slate-400',
          progress: 'bg-red-500 dark:bg-red-600',
          progressBg: 'bg-red-100 dark:bg-red-950/30',
          StatusIcon: AlertCircle,
        }
      default: // info
        return {
          container: 'bg-white dark:bg-slate-900 border-l-4 border-blue-500',
          iconContainer: 'bg-blue-50 dark:bg-blue-950/50',
          icon: 'text-blue-600 dark:text-blue-400',
          title: 'text-slate-900 dark:text-slate-100',
          message: 'text-slate-600 dark:text-slate-400',
          progress: 'bg-blue-500 dark:bg-blue-600',
          progressBg: 'bg-blue-100 dark:bg-blue-950/30',
          StatusIcon: Info,
        }
    }
  }

  const getNotificationIcon = () => {
    switch (toast.notificationType) {
      case 'ticket_assigned':
      case 'ticket_status_changed':
        return FileText
      case 'ticket_commented':
        return MessageSquare
      case 'team_message':
        return Users
      case 'asset_assigned':
      case 'asset_updated':
        return Package
      case 'department_ticket':
        return Activity
      default:
        return Bell
    }
  }

  const styles = getTypeStyles()
  const NotificationIcon = getNotificationIcon()
  const StatusIcon = styles.StatusIcon

  return (
    <div
      className={`
        toast-notification
        ${isExiting ? 'toast-exit' : 'toast-enter'}
        w-[calc(100vw-2rem)] sm:w-[420px] max-w-[420px]
        ${styles.container}
        shadow-lg hover:shadow-xl
        border-r border-t border-b border-slate-200 dark:border-slate-800
        transition-all duration-200
        overflow-hidden
      `}
      onClick={toast.onClick ? handleClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: toast.onClick ? 'pointer' : 'default' }}
    >
      <div className="p-3 sm:p-4">
        <div className="flex items-start gap-2 sm:gap-3">
          {/* Icon Container with Status Badge */}
          <div className="flex-shrink-0 relative">
            {/* Main notification icon */}
            <div className={`
              ${styles.iconContainer}
              h-10 w-10 sm:h-11 sm:w-11 rounded-lg
              flex items-center justify-center
              ring-1 ring-slate-200 dark:ring-slate-700
            `}>
              <NotificationIcon className={`h-5 w-5 ${styles.icon}`} />
            </div>
            
            {/* Status badge overlay */}
            <div className={`
              absolute -bottom-1 -right-1
              ${styles.iconContainer}
              h-5 w-5 rounded-full
              flex items-center justify-center
              ring-2 ring-white dark:ring-slate-900
            `}>
              <StatusIcon className={`h-3 w-3 ${styles.icon}`} />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-0.5 sm:pt-1">
            <div className="flex items-start justify-between gap-2">
              <h4 className={`font-semibold text-xs sm:text-sm ${styles.title} mb-0.5 sm:mb-1 leading-tight`}>
                {toast.title}
              </h4>
              
              {/* Close Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDismiss()
                }}
                className="
                  h-6 w-6 sm:h-7 sm:w-7 rounded-md flex-shrink-0
                  text-slate-400 hover:text-slate-600
                  dark:text-slate-500 dark:hover:text-slate-300
                  hover:bg-slate-100 dark:hover:bg-slate-800
                  transition-colors duration-150
                  -mt-0.5 sm:-mt-1 -mr-0.5 sm:-mr-1
                "
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
            
            <p className={`text-xs sm:text-sm ${styles.message} leading-relaxed line-clamp-2`}>
              {toast.message}
            </p>

            {/* Timestamp indicator */}
            <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2">
              <div className="h-1 w-1 rounded-full bg-slate-400 dark:bg-slate-600"></div>
              <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                Just now
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className={`h-1 ${styles.progressBg}`}>
        <div
          className={`h-full ${styles.progress} transition-all duration-100 ease-linear`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes toastEnter {
          from {
            opacity: 0;
            transform: translateX(100%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes toastExit {
          from {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
          to {
            opacity: 0;
            transform: translateX(100%) scale(0.95);
          }
        }

        .toast-enter {
          animation: toastEnter 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .toast-exit {
          animation: toastExit 0.3s cubic-bezier(0.4, 0, 1, 1) forwards;
        }
      `}</style>
    </div>
  )
}

// Toast Container Component - EXPORTED
interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-2 sm:right-4 left-2 sm:left-auto z-[100] flex flex-col gap-2 sm:gap-3 pointer-events-none max-w-[calc(100vw-1rem)] sm:max-w-none">
      {toasts.slice(0, 5).map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastNotification toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}