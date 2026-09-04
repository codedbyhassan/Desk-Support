// App.tsx - canonical application routing
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
import DepartmentsPage from './pages/DepartmentsPage'
import DepartmentDetailPage from './pages/departments/[id]'
import TeamsPage from './pages/TeamsPage'
import CallPage from './pages/CallPage'
import SettingsPage from './pages/SettingsPage'
import QRScannerPage from './pages/QRScannerPage'
import WorkspacePage from './pages/WorkspacePage'
import NotificationsPage from './pages/NotificationsPage'
import Layout from './app/layout'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth(); const location = useLocation()
  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return <Layout>{children}</Layout>
}

function AdminOrHRRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>
  if (!user || (user.role !== 'admin' && user.role !== 'hr')) return <Navigate to="/app/dashboard" replace />
  return <Layout>{children}</Layout>
}

function AppRoutes() {
  const { user } = useAuth()
  return <Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/login" element={user ? <Navigate to="/app/dashboard" replace /> : <LoginPage defaultToSignUp={false} />} />
    <Route path="/signup" element={user ? <Navigate to="/app/dashboard" replace /> : <LoginPage defaultToSignUp />} />
    <Route path="/verify-email" element={<VerificationPage />} />
    <Route path="/app" element={<ProtectedRoute><Navigate to="/app/dashboard" replace /></ProtectedRoute>} />
    <Route path="/app/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
    <Route path="/app/dashboard/users" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
    <Route path="/app/dashboard/assets" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
    <Route path="/app/tickets" element={<ProtectedRoute><TicketsPage /></ProtectedRoute>} />
    <Route path="/app/tickets/new" element={<ProtectedRoute><TicketsPage newTicket /></ProtectedRoute>} />
    <Route path="/app/tickets/:id" element={<ProtectedRoute><TicketDetailPage /></ProtectedRoute>} />
    <Route path="/app/assets" element={<ProtectedRoute><AssetsPage /></ProtectedRoute>} />
    <Route path="/app/assets/new" element={<ProtectedRoute><AssetsPage newAsset /></ProtectedRoute>} />
    <Route path="/app/assets/:id" element={<ProtectedRoute><AssetDetailPage /></ProtectedRoute>} />
    <Route path="/app/departments" element={<ProtectedRoute><DepartmentsPage /></ProtectedRoute>} />
    <Route path="/app/departments/:id" element={<ProtectedRoute><DepartmentDetailPage /></ProtectedRoute>} />
    <Route path="/app/teams" element={<ProtectedRoute><TeamsPage /></ProtectedRoute>} />
    <Route path="/app/teams/call/:roomId" element={<ProtectedRoute><CallPage /></ProtectedRoute>} />
    <Route path="/app/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
    <Route path="/app/users" element={<AdminOrHRRoute><UsersPage /></AdminOrHRRoute>} />
    <Route path="/app/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
    <Route path="/app/qr-scanner" element={<ProtectedRoute><QRScannerPage /></ProtectedRoute>} />
    <Route path="/app/working-area" element={<ProtectedRoute><WorkspacePage /></ProtectedRoute>} />
    <Route path="/app/workspace" element={<ProtectedRoute><WorkspacePage /></ProtectedRoute>} />
    <Route path="/app/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
}

function ToastWrapper() {
  const location = useLocation(); const { toasts, dismissToast, setCurrentPath } = useNotifications()
  React.useEffect(() => { setCurrentPath(window.location.hash.replace('#', '') || location.pathname) }, [location.pathname, setCurrentPath])
  return <ToastContainer toasts={toasts} onDismiss={dismissToast} />
}

export default function App() {
  return <ErrorBoundary><AuthProvider><ThemeProvider><ColorSchemeProvider><NotificationProvider><QRCodeProvider><HashRouter><ToastWrapper /><AppRoutes /><Toaster position="bottom-right" toastOptions={{ duration: 5000 }} /></HashRouter></QRCodeProvider></NotificationProvider></ColorSchemeProvider></ThemeProvider></AuthProvider></ErrorBoundary>
}
