// App.tsx - Updated with HashRouter for Electron

import React from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Toaster } from 'react-hot-toast'
import { NotificationProvider, useNotifications } from './context/NotificationContext'
import { ToastContainer } from '@/components/ToastNotification'

// ✅ Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import TicketsPage from './pages/TicketsPage'
import TicketDetailPage from '@/pages/tickets/[id]'
import AssetsPage from './pages/AssetsPage'
import AssetDetailPage from '@/pages/assets/[id]'
import ProfilePage from './pages/ProfilePage'
import UsersPage from './pages/UsersPage'
import AnalyticsDashboard from '@/pages/dashboard/AnalyticsDashboard'

// ✅ Newly Added Pages
import DepartmentsPage from './pages/DepartmentsPage'
import DepartmentDetailPage from './pages/departments/[id]'
import TeamsPage from './pages/TeamsPage'
import SettingsPage from './pages/SettingsPage'

// ❌ REMOVED: TeamChatView is now a component, not a page
// import TeamChatView from '@/pages/teams/TeamChatView'

import Layout from './components/Layout'

/* ------------------------- PROTECTED ROUTE WRAPPERS ------------------------- */

// 🔒 Restrict access to authenticated users
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-3 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Layout>{children}</Layout>
}

// 🔑 Restrict access to admins only
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-3 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/app/dashboard" replace />
  }

  return <Layout>{children}</Layout>
}

/* ------------------------------- MAIN ROUTES ------------------------------- */

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <Routes>
      {/* 🌍 Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          user ? <Navigate to="/app/dashboard" replace /> : <LoginPage defaultToSignUp={false} />
        }
      />
      <Route
        path="/signup"
        element={
          user ? <Navigate to="/app/dashboard" replace /> : <LoginPage defaultToSignUp={true} />
        }
      />

      {/* 🔒 Protected Routes */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <Navigate to="/app/dashboard" replace />
          </ProtectedRoute>
        }
      />

      {/* 🧭 Dashboard */}
      <Route
        path="/app/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      {/* 🎫 Tickets */}
      <Route
        path="/app/tickets"
        element={
          <ProtectedRoute>
            <TicketsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/tickets/new"
        element={
          <ProtectedRoute>
            <TicketsPage newTicket={true} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/tickets/:id"
        element={
          <ProtectedRoute>
            <TicketDetailPage />
          </ProtectedRoute>
        }
      />

      {/* 💻 Assets */}
      <Route
        path="/app/assets"
        element={
          <ProtectedRoute>
            <AssetsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/assets/:id"
        element={
          <ProtectedRoute>
            <AssetDetailPage />
          </ProtectedRoute>
        }
      />

      {/* 🏢 Departments */}
      <Route
        path="/app/departments"
        element={
          <ProtectedRoute>
            <DepartmentsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/departments/:id"
        element={
          <ProtectedRoute>
            <DepartmentDetailPage />
          </ProtectedRoute>
        }
      />

      {/* 👥 Teams - Now includes chat as a component */}
      <Route
        path="/app/teams"
        element={
          <ProtectedRoute>
            <TeamsPage />
          </ProtectedRoute>
        }
      />
      {/* ❌ REMOVED: /app/teams/:teamId route - chat is now embedded in TeamsPage */}

      {/* ⚙️ Settings */}
      <Route
        path="/app/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      {/* 📊 Analytics (Admin only) */}
      <Route
        path="/app/analytics"
        element={
          <AdminRoute>
            <AnalyticsDashboard />
          </AdminRoute>
        }
      />

      {/* 👨‍💼 Users (Admin only) */}
      <Route
        path="/app/users"
        element={
          <AdminRoute>
            <UsersPage />
          </AdminRoute>
        }
      />

      {/* 🧑‍🎓 Profile */}
      <Route
        path="/app/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

      {/* 🚧 Fallback for unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

/* ----------------------- TOAST WRAPPER COMPONENT ----------------------- */
// ✅ This component accesses the notification context and renders toasts
function ToastWrapper() {
  const location = useLocation()
  const { toasts, dismissToast, setCurrentPath } = useNotifications()
  
  // ✅ Update current path whenever location changes
  // Note: setCurrentPath is stable (from useState), so it doesn't need to be in deps
  React.useEffect(() => {
    // Get path from hash for HashRouter
    const hashPath = window.location.hash.replace('#', '') || location.pathname
    setCurrentPath(hashPath)
  }, [location.pathname, setCurrentPath])
  
  return <ToastContainer toasts={toasts} onDismiss={dismissToast} />
}

/* ----------------------------- ROOT APP EXPORT ----------------------------- */

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <HashRouter>
            {/* ✅ Toast Container - Shows real-time notification toasts */}
            <ToastWrapper />
            
            <AppRoutes />
            
            {/* Existing react-hot-toast for manual toasts */}
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 5000,
                className: 'rounded-xl shadow-lg p-4 bg-white dark:bg-gray-800',
                success: {
                  className: 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200',
                  iconTheme: { primary: '#22c55e', secondary: '#fff' },
                },
                error: {
                  className: 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200',
                  iconTheme: { primary: '#ef4444', secondary: '#fff' },
                },
              }}
            />
          </HashRouter>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}