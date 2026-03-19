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

function AppRoutes() {
  const { user, profile, loading } = useAuth()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-4xl animate-bounce">🍽️</div>
    </div>
  )

  if (!user) return <Login />
  if (!profile?.name) return <ProfileSetup />

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0 md:pt-16">
      <Nav />
      <Routes>
        <Route path="/" element={<Navigate to="/feed" />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/lab" element={<FlavorLab />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/staff" element={<StaffPanel />} />
        <Route path="*" element={<Navigate to="/feed" />} />
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