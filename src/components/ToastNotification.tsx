// src/components/ToastNotification.tsx
import { useEffect, useState } from 'react'
import { X, Bell, FileText, MessageSquare, Users, Package, Activity, CheckCheck } from 'lucide-react'
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
          gradient: 'from-emerald-500 to-teal-500',
          iconBg: 'bg-emerald-500',
          textColor: 'text-emerald-900 dark:text-emerald-100',
          progress: 'bg-gradient-to-r from-emerald-400 to-teal-400',
        }
      case 'warning':
        return {
          gradient: 'from-amber-500 to-orange-500',
          iconBg: 'bg-amber-500',
          textColor: 'text-amber-900 dark:text-amber-100',
          progress: 'bg-gradient-to-r from-amber-400 to-orange-400',
        }
      case 'error':
        return {
          gradient: 'from-red-500 to-rose-500',
          iconBg: 'bg-red-500',
          textColor: 'text-red-900 dark:text-red-100',
          progress: 'bg-gradient-to-r from-red-400 to-rose-400',
        }
      default: // info
        return {
          gradient: 'from-blue-500 to-indigo-500',
          iconBg: 'bg-blue-500',
          textColor: 'text-blue-900 dark:text-blue-100',
          progress: 'bg-gradient-to-r from-blue-400 to-indigo-400',
        }
    }
  }

  const getNotificationIcon = () => {
    const iconClass = 'h-5 w-5 text-white'
    
    switch (toast.notificationType) {
      case 'ticket_assigned':
      case 'ticket_status_changed':
        return <FileText className={iconClass} />
      case 'ticket_commented':
        return <MessageSquare className={iconClass} />
      case 'team_message':
        return <Users className={iconClass} />
      case 'asset_assigned':
      case 'asset_updated':
        return <Package className={iconClass} />
      case 'department_ticket':
        return <Activity className={iconClass} />
      default:
        return <Bell className={iconClass} />
    }
  }

  const styles = getTypeStyles()

  return (
    <div
      className={`
        toast-notification
        ${isExiting ? 'toast-exit' : 'toast-enter'}
        w-[400px] rounded-2xl
        bg-white dark:bg-gray-900 
        shadow-2xl
        overflow-hidden
        backdrop-blur-xl
        border border-gray-200 dark:border-gray-700
      `}
      onClick={toast.onClick ? handleClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ cursor: toast.onClick ? 'pointer' : 'default' }}
    >
      {/* Gradient Top Bar */}
      <div className={`h-1 bg-gradient-to-r ${styles.gradient}`} />

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon with Gradient Background */}
          <div className={`
            flex-shrink-0 h-12 w-12 rounded-2xl 
            ${styles.iconBg}
            shadow-lg
            flex items-center justify-center
            transform transition-transform duration-200
            ${isHovered ? 'scale-110' : 'scale-100'}
          `}>
            {getNotificationIcon()}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-start justify-between gap-2">
              <h4 className={`font-semibold text-sm ${styles.textColor} mb-1`}>
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
                className="h-7 w-7 rounded-full flex-shrink-0 hover:bg-gray-100 dark:hover:bg-gray-800 -mt-1 -mr-1 opacity-60 hover:opacity-100 transition-opacity"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 leading-relaxed">
              {toast.message}
            </p>

            {/* Time indicator */}
            <div className="flex items-center gap-1 mt-2">
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <CheckCheck className="h-3 w-3" />
                <span>Just now</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-gray-100 dark:bg-gray-800">
        <div
          className={`h-full ${styles.progress} transition-all duration-100 ease-linear shadow-sm`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes toastEnter {
          from {
            opacity: 0;
            transform: translateX(100%) scale(0.9);
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
            transform: translateX(100%) scale(0.9);
          }
        }

        .toast-enter {
          animation: toastEnter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .toast-exit {
          animation: toastExit 0.3s cubic-bezier(0.4, 0, 1, 1) forwards;
        }

        .toast-notification:hover {
          transform: translateY(-2px);
          transition: transform 0.2s ease;
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
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.slice(0, 5).map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastNotification toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}