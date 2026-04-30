import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import { AuthProvider, useAuth } from './context/AuthContext'
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
  if (!user.isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-accent" />
  return user ? <Navigate to="/dashboard" replace /> : children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={
        <PublicOnlyRoute><HomePage /></PublicOnlyRoute>
      } />

      <Route element={<Layout />}>
        <Route path="/dashboard" element={
          <PrivateRoute><DashboardPage /></PrivateRoute>
        } />
        <Route path="/brain-dump" element={
          <PrivateRoute><BrainDumpPage /></PrivateRoute>
        } />
        <Route path="/ideas" element={
          <PrivateRoute><IdeaDumpPage /></PrivateRoute>
        } />
        <Route path="/routines" element={
          <PrivateRoute><RoutinePage /></PrivateRoute>
        } />
        <Route path="/shop" element={
          <PrivateRoute><ShopPage /></PrivateRoute>
        } />
        <Route path="/mypage" element={
          <PrivateRoute><MyPage /></PrivateRoute>
        } />
        <Route path="/notices" element={
          <PrivateRoute><NoticePage /></PrivateRoute>
        } />
        <Route path="/admin" element={
          <AdminRoute><AdminPage /></AdminRoute>
        } />
      </Route>

      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Sentry.ErrorBoundary fallback={<div className="min-h-screen bg-accent" />}>
          <AppRoutes />
        </Sentry.ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
