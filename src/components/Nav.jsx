/* eslint-disable no-unused-vars */
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { ChefHat,UtensilsCrossed, FlaskConical, LayoutDashboard, LogOut } from 'lucide-react'

export default function Nav() {
  const { profile } = useAuth()
  const location = useLocation()

  const links = [
  { to: '/feed', icon: UtensilsCrossed, label: 'Feed' },
  { to: '/lab', icon: FlaskConical, label: 'Flavor Lab' },
  ...(profile?.role === 'manager' || profile?.role === 'staff'
    ? [
        { to: '/staff', icon: ChefHat, label: 'Post Meal' },
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      ]
    : []),
]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 flex items-center justify-around z-50 md:top-0 md:bottom-auto md:border-t-0 md:border-b md:px-8 md:justify-between">
      <Link to="/feed" className="flex items-center gap-2 font-bold text-gray-900 text-lg hidden md:flex">
        🍽️ <span>Mess-Feed</span>
      </Link>
      <div className="flex items-center gap-1 md:gap-4">
        {links.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={`flex flex-col md:flex-row items-center gap-1 px-3 py-2 rounded-xl text-xs md:text-sm font-medium transition-colors ${
              location.pathname === to
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
        <button
          onClick={() => supabase.auth.signOut()}
          className="flex flex-col md:flex-row items-center gap-1 px-3 py-2 rounded-xl text-xs md:text-sm font-medium text-gray-500 hover:text-red-500 transition-colors"
        >
          <LogOut size={18} />
          <span className="hidden md:block">Sign out</span>
        </button>
      </div>
    </nav>
  )
}