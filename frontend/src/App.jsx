import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/layout/Layout'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import BrainDumpPage from './pages/BrainDumpPage'
import IdeaDumpPage from './pages/IdeaDumpPage'
import RoutinePage from './pages/RoutinePage'
import ShopPage from './pages/ShopPage'
import AdminPage from './pages/AdminPage'

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
        <Route path="/admin" element={
          <AdminRoute><AdminPage /></AdminRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
