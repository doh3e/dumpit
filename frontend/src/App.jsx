import { useEffect } from 'react'
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider, notifyToast } from './context/ToastContext'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import BrainDumpPage from './pages/BrainDumpPage'
import IdeaDumpPage from './pages/IdeaDumpPage'
import RoutinePage from './pages/RoutinePage'
import ShopPage from './pages/ShopPage'
import AdminPage from './pages/AdminPage'
import MyPage from './pages/MyPage'
import NoticePage from './pages/NoticePage'
import PrivacyPage from './pages/PrivacyPage'
import TermsPage from './pages/TermsPage'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-accent" />
  return user ? children : <Navigate to="/" replace />
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-accent" />
  if (!user) return <Navigate to="/" replace />
  if (!user.isAdmin) return <AccessDeniedRedirect />
  return children
}

function AccessDeniedRedirect() {
  useEffect(() => {
    notifyToast('관리자만 접근할 수 있어요.')
  }, [])
  return <Navigate to="/dashboard" replace />
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-accent" />
  return user ? <Navigate to="/dashboard" replace /> : children
}

function Root() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Sentry.ErrorBoundary fallback={<div className="min-h-screen bg-accent" />}>
          <Outlet />
        </Sentry.ErrorBoundary>
      </ToastProvider>
    </AuthProvider>
  )
}

const router = createBrowserRouter([
  {
    element: <Root />,
    children: [
      { path: '/', element: <PublicOnlyRoute><HomePage /></PublicOnlyRoute> },
      {
        element: <Layout />,
        children: [
          { path: '/dashboard', element: <PrivateRoute><DashboardPage /></PrivateRoute> },
          { path: '/brain-dump', element: <PrivateRoute><BrainDumpPage /></PrivateRoute> },
          { path: '/ideas', element: <PrivateRoute><IdeaDumpPage /></PrivateRoute> },
          { path: '/routines', element: <PrivateRoute><RoutinePage /></PrivateRoute> },
          { path: '/shop', element: <PrivateRoute><ShopPage /></PrivateRoute> },
          { path: '/mypage', element: <PrivateRoute><MyPage /></PrivateRoute> },
          { path: '/notices', element: <PrivateRoute><NoticePage /></PrivateRoute> },
          { path: '/admin', element: <AdminRoute><AdminPage /></AdminRoute> },
        ],
      },
      { path: '/privacy', element: <PrivacyPage /> },
      { path: '/terms', element: <TermsPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
