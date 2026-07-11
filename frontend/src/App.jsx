import { useEffect, lazy, Suspense, Component } from 'react'
import { createBrowserRouter, RouterProvider, Outlet, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider, notifyToast } from './context/ToastContext'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const BrainDumpPage = lazy(() => import('./pages/BrainDumpPage'))
const IdeaDumpPage = lazy(() => import('./pages/IdeaDumpPage'))
const RoutinePage = lazy(() => import('./pages/RoutinePage'))
const ShopPage = lazy(() => import('./pages/ShopPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const MyPage = lazy(() => import('./pages/MyPage'))
const NoticePage = lazy(() => import('./pages/NoticePage'))
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'))
const TermsPage = lazy(() => import('./pages/TermsPage'))

/** Sentry 지연 로드와 호환되는 자체 에러 바운더리 — 캐치 시점에 SDK를 불러 전송 */
class AppErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch(error) {
    import('@sentry/react').then((Sentry) => Sentry.captureException(error)).catch(() => {})
  }
  render() {
    if (this.state.hasError) return <div className="min-h-screen bg-accent" />
    return this.props.children
  }
}

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
        <AppErrorBoundary>
          <Suspense fallback={<div className="min-h-screen bg-accent" />}>
            <Outlet />
          </Suspense>
        </AppErrorBoundary>
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
