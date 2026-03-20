/* eslint-disable no-unused-vars */
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Rss, FlaskConical, LayoutDashboard, LogOut, ChefHat } from 'lucide-react'

export default function Nav() {
  const { profile } = useAuth()
  const location = useLocation()
  const isStaff = profile?.role === 'manager' || profile?.role === 'staff'

  const links = [
    { to: '/feed', icon: Rss, label: 'Feed' },
    { to: '/lab', icon: FlaskConical, label: 'Flavor Lab' },
    ...(isStaff ? [
      { to: '/staff', icon: ChefHat, label: 'Post Meal' },
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ] : []),
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-2 py-2 flex items-center justify-around z-50 md:top-0 md:bottom-auto md:border-t-0 md:border-b md:px-8 md:justify-between md:py-0 md:h-16">
      <Link to="/feed" className="hidden md:flex items-center gap-2.5 font-bold text-gray-900">
        <div className="w-7 h-7 bg-gray-900 rounded-lg flex items-center justify-center">
          <Rss size={14} className="text-white" />
        </div>
        Mess-Feed
      </Link>

      <div className="flex items-center gap-1 md:gap-2">
        {links.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to
          return (
            <Link key={to} to={to}
              className={`flex flex-col md:flex-row items-center gap-1 px-3 py-2 rounded-xl text-xs md:text-sm font-medium transition-all ${
                active ? 'text-gray-900 bg-gray-100' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
              }`}>
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
              <span className="hidden md:block">{label}</span>
              <span className="md:hidden text-[10px]">{label}</span>
            </Link>
          )
        })}

        <div className="hidden md:block w-px h-5 bg-gray-200 mx-1" />

        <div className="hidden md:flex items-center gap-2 pl-1">
          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
            {profile?.name?.[0]?.toUpperCase()}
          </div>
          <div className="text-xs">
            <p className="font-medium text-gray-700 leading-none">{profile?.name}</p>
            <p className="text-gray-400 mt-0.5 capitalize">{profile?.role}</p>
          </div>
        </div>

        <button onClick={() => supabase.auth.signOut()}
          className="flex flex-col md:flex-row items-center gap-1 px-3 py-2 rounded-xl text-xs md:text-sm font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all">
          <LogOut size={18} strokeWidth={1.8} />
          <span className="md:hidden text-[10px]">Out</span>
        </button>
      </div>
    </nav>
  )
}