import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import AuthProvider from './context/AuthProvider'
import Login from './pages/Login'
import ProfileSetup from './pages/ProfileSetup'
import Feed from './pages/Feed'
import FlavorLab from './pages/FlavorLab'
import Dashboard from './pages/Dashboard'
import StaffPanel from './pages/StaffPanel'
import Nav from './components/Nav'

function ProtectedRoute({ children, allowedRoles }) {
  const { profile } = useAuth()
  if (!allowedRoles.includes(profile?.role)) {
    return <Navigate to="/feed" replace />
  }
  return children
}

function AppRoutes() {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!user) return <Login />
  if (!profile?.name) return <ProfileSetup />

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0 md:pt-16">
      <Nav />
      <Routes>
        <Route path="/" element={<Navigate to="/feed" replace />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/lab" element={<FlavorLab />} />
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['manager', 'staff']}>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/staff" element={
          <ProtectedRoute allowedRoles={['manager', 'staff']}>
            <StaffPanel />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/feed" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}