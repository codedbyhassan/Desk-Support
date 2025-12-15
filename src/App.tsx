// App.tsx - Fixed version without redundant loading check

import React from 'react'
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Toaster } from 'react-hot-toast'
import { NotificationProvider, useNotifications } from './context/NotificationContext'
import { QRCodeProvider } from './context/QRCodeContext'
import { ThemeProvider } from './context/ThemeContext'
import { ColorSchemeProvider } from './context/ColorSchemeContext'
import { ToastContainer } from '@/components/ToastNotification'

// ✅ Pages
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import VerificationPage from './pages/VerificationPage'
import DashboardPage from './pages/DashboardPage'
import TicketsPage from './pages/TicketsPage'
import TicketDetailPage from '@/pages/tickets/[id]'
import AssetsPage from './pages/AssetsPage'
import AssetDetailPage from '@/pages/assets/[id]'
import ProfilePage from './pages/ProfilePage'
import UsersPage from './pages/UsersPage'

// ✅ Newly Added Pages
import DepartmentsPage from './pages/DepartmentsPage'
import DepartmentDetailPage from './pages/departments/[id]'
import TeamsPage from './pages/TeamsPage'
import CallPage from './pages/CallPage'
import SettingsPage from './pages/SettingsPage'
import QRScannerPage from './pages/QRScannerPage'
import WorkingAreaPage from './pages/WorkingArea'
import NotificationsPage from './pages/NotificationsPage'

import Layout from './app/layout'

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

// 🔑 Restrict access to admins and HR
function AdminOrHRRoute({ children }: { children: React.ReactNode }) {
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

  if (!user || (user.role !== 'admin' && user.role !== 'hr')) {
    return <Navigate to="/app/dashboard" replace />
  }

  return <Layout>{children}</Layout>
}

/* ------------------------------- MAIN ROUTES ------------------------------- */

function AppRoutes() {
  const { user } = useAuth() // ✅ REMOVED: loading check - let individual routes handle it

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
      <Route
        path="/verify-email"
        element={<VerificationPage />}
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

      {/* 🧭 Dashboard - More specific routes first */}
      <Route
        path="/app/dashboard/users"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/dashboard/assets"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
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
        path="/app/assets/new"
        element={
          <ProtectedRoute>
            <AssetsPage newAsset />
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

      {/* 📞 Team call */}
      <Route
        path="/app/teams/call/:roomId"
        element={
          <ProtectedRoute>
            <CallPage />
          </ProtectedRoute>
        }
      />

      {/* ⚙️ Settings */}
      <Route
        path="/app/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      {/* 👨‍💼 Users (Admin and HR) */}
      <Route
        path="/app/users"
        element={
          <AdminOrHRRoute>
            <UsersPage />
          </AdminOrHRRoute>
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

      {/* 📱 QR Scanner */}
      <Route
        path="/app/qr-scanner"
        element={
          <ProtectedRoute>
            <QRScannerPage />
          </ProtectedRoute>
        }
      />

      {/* 📁 Working Area */}
      <Route
        path="/app/working-area"
        element={
          <ProtectedRoute>
            <WorkingAreaPage />
          </ProtectedRoute>
        }
      />

      {/* 🔔 Notifications */}
      <Route
        path="/app/notifications"
        element={
          <ProtectedRoute>
            <NotificationsPage />
          </ProtectedRoute>
        }
      />

      {/* 🚧 Fallback for unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

/* ----------------------- TOAST WRAPPER COMPONENT ----------------------- */
function ToastWrapper() {
  const location = useLocation()
  const { toasts, dismissToast, setCurrentPath } = useNotifications()
  
  React.useEffect(() => {
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
        <ThemeProvider>
          <ColorSchemeProvider>
            <NotificationProvider>
              <QRCodeProvider>
                <HashRouter>
                  <ToastWrapper />
                  <AppRoutes />
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
            </QRCodeProvider>
          </NotificationProvider>
          </ColorSchemeProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}