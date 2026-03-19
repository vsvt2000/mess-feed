import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import MealCard from '../components/MealCard'
import { UtensilsCrossed } from 'lucide-react'

export default function Feed() {
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(true)
  const { profile } = useAuth()

 useEffect(() => {
  let ignore = false

  async function load() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('meals')
      .select(`*, dishes(*)`)
      .eq('date', today)
      .order('created_at', { ascending: true })
    if (!ignore) {
      setMeals(data || [])
      setLoading(false)
    }
  }

  load()
  return () => { ignore = true }
}, [])



  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-4xl animate-bounce">🍽️</div>
    </div>
  )

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Today's Feed</h1>
          <p className="text-sm text-gray-500">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        {profile?.is_verified_eater && (
          <span className="bg-green-50 text-green-700 text-xs font-medium px-3 py-1 rounded-full border border-green-200">
            ✓ Verified Eater
          </span>
        )}
      </div>

      {meals.length === 0 ? (
        <div className="text-center py-20">
          <UtensilsCrossed size={40} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No meals posted yet today</p>
          <p className="text-gray-400 text-sm mt-1">Check back at meal time</p>
        </div>
      ) : (
        <div className="space-y-6">
          {meals.map(meal => (
            <MealCard key={meal.id} meal={meal} />
          ))}
        </div>
      )}
    </div>
  )
}