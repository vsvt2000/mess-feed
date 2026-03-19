import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { AlertTriangle, Trophy, TrendingUp } from 'lucide-react'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MEALS = ['breakfast', 'lunch', 'dinner']
const MEAL_ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙' }

export default function Dashboard() {
  const { profile } = useAuth()
  const [heatmap, setHeatmap] = useState({})
  const [leaderboard, setLeaderboard] = useState([])
  const [alerts, setAlerts] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchHeatmap(ignore) {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const from = sevenDaysAgo.toISOString().split('T')[0]

    const { data: meals } = await supabase
      .from('meals')
      .select('id, date, type')
      .gte('date', from)

    if (!meals) return

    const mealIds = meals.map(m => m.id)
    const { data: dishes } = await supabase
      .from('dishes')
      .select('id, meal_id')
      .in('meal_id', mealIds)

    const dishIds = dishes?.map(d => d.id) || []
    const { data: reactions } = await supabase
      .from('reactions')
      .select('dish_id, type')
      .in('dish_id', dishIds)

    // Build a map: dish_id -> meal info
    const dishToMeal = {}
    dishes?.forEach(d => {
      const meal = meals.find(m => m.id === d.meal_id)
      if (meal) dishToMeal[d.id] = meal
    })

    // Aggregate by meal
    const map = {}
    reactions?.forEach(r => {
      const meal = dishToMeal[r.dish_id]
      if (!meal) return
      const key = `${meal.date}_${meal.type}`
      if (!map[key]) map[key] = { fire: 0, ice: 0, nausea: 0 }
      map[key][r.type]++
    })

    if (!ignore) setHeatmap(map)
  }

  async function fetchLeaderboard(ignore) {
    const { data: votes } = await supabase
      .from('votes')
      .select('dish_id, value')

    const { data: dishes } = await supabase
      .from('dishes')
      .select('id, name')

    if (!votes || !dishes) return

    const scores = {}
    votes.forEach(v => {
      scores[v.dish_id] = (scores[v.dish_id] || 0) + v.value
    })

    const ranked = dishes
      .map(d => ({ name: d.name, score: scores[d.id] || 0 }))
      .filter(d => d.score !== 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)

    if (!ignore) setLeaderboard(ranked)
  }

  async function fetchWasteAlerts(ignore) {
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString()

    const { data: recentReactions } = await supabase
      .from('reactions')
      .select('dish_id, type')
      .gte('created_at', fifteenMinAgo)

    if (!recentReactions || recentReactions.length === 0) return

    // Group by dish
    const dishCounts = {}
    recentReactions.forEach(r => {
      if (!dishCounts[r.dish_id]) dishCounts[r.dish_id] = { total: 0, nausea: 0 }
      dishCounts[r.dish_id].total++
      if (r.type === 'nausea') dishCounts[r.dish_id].nausea++
    })

    // Find dishes above 30% nausea threshold
    const alertDishIds = Object.entries(dishCounts)
      .filter(([_, c]) => c.total >= 3 && c.nausea / c.total > 0.3)
      .map(([id]) => id)

    if (alertDishIds.length === 0) return

    const { data: alertDishes } = await supabase
      .from('dishes')
      .select('id, name')
      .in('id', alertDishIds)

    if (!ignore) {
      setAlerts(alertDishes?.map(d => ({
        ...d,
        nauseaRate: Math.round((dishCounts[d.id].nausea / dishCounts[d.id].total) * 100),
        total: dishCounts[d.id].total
      })) || [])
    }
  }

  useEffect(() => {
    if (profile?.role !== 'manager' && profile?.role !== 'staff') return
    let ignore = false

    async function load() {
      await Promise.all([
        fetchHeatmap(ignore),
        fetchLeaderboard(ignore),
        fetchWasteAlerts(ignore),
      ])
      if (!ignore) setLoading(false)
    }

    load()
    return () => { ignore = true }
  }, [profile])

  

  function getHeatmapColor(key) {
    const data = heatmap[key]
    if (!data) return 'bg-gray-50 text-gray-300'
    const total = data.fire + data.ice + data.nausea
    if (total === 0) return 'bg-gray-50 text-gray-300'
    const negRate = (data.nausea + data.ice) / total
    const posRate = data.fire / total
    if (negRate > 0.4) return 'bg-red-100 text-red-700'
    if (posRate > 0.6) return 'bg-green-100 text-green-700'
    return 'bg-yellow-50 text-yellow-700'
  }

  function getHeatmapEmoji(key) {
    const data = heatmap[key]
    if (!data) return '—'
    const total = data.fire + data.ice + data.nausea
    if (total === 0) return '—'
    const negRate = (data.nausea + data.ice) / total
    const posRate = data.fire / total
    if (negRate > 0.4) return '🔴'
    if (posRate > 0.6) return '🟢'
    return '🟡'
  }

  function getWeekDates() {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - 6 + i)
      return d.toISOString().split('T')[0]
    })
  }

  if (profile?.role !== 'manager' && profile?.role !== 'staff') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500 font-medium">Access restricted to staff and managers.</p>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-4xl animate-bounce">📊</div>
    </div>
  )

  const weekDates = getWeekDates()

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Chef's Dashboard</h1>
        <p className="text-sm text-gray-500">Live sentiment data for your mess</p>
      </div>

      {/* Waste Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <AlertTriangle size={18} className="text-red-500" />
            Waste Alerts
          </h2>
          {alerts.map(alert => (
            <div key={alert.id} className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-red-800">⚠️ {alert.name}</p>
                <p className="text-sm text-red-600 mt-0.5">
                  {alert.nauseaRate}% negative reactions in last 15 min ({alert.total} reactions)
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-red-500 font-medium">Reduce production</p>
                <p className="text-xs text-red-400">for next batch</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sentiment Heatmap */}
      <div>
        <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
          <TrendingUp size={18} className="text-blue-500" />
          Sentiment Map — Last 7 Days
        </h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-8 border-b border-gray-100">
            <div className="p-3 text-xs text-gray-400 font-medium"></div>
            {weekDates.map((date, i) => (
              <div key={date} className="p-3 text-center">
                <p className="text-xs font-medium text-gray-700">{DAYS[new Date(date).getDay() === 0 ? 6 : new Date(date).getDay() - 1]}</p>
                <p className="text-xs text-gray-400">{new Date(date).getDate()}</p>
              </div>
            ))}
          </div>
          {/* Meal rows */}
          {MEALS.map(meal => (
            <div key={meal} className="grid grid-cols-8 border-b border-gray-50 last:border-0">
              <div className="p-3 flex items-center gap-1">
                <span className="text-sm">{MEAL_ICONS[meal]}</span>
                <span className="text-xs text-gray-500 capitalize hidden sm:block">{meal}</span>
              </div>
              {weekDates.map(date => {
                const key = `${date}_${meal}`
                const data = heatmap[key]
                const total = data ? data.fire + data.ice + data.nausea : 0
                return (
                  <div key={key} className={`p-2 flex flex-col items-center justify-center min-h-14 ${getHeatmapColor(key)}`}>
                    <span className="text-base">{getHeatmapEmoji(key)}</span>
                    {total > 0 && <span className="text-xs mt-0.5 font-medium">{total}</span>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 px-1">
          <span>🟢 Positive (&gt;60% 🔥)</span>
          <span>🟡 Mixed</span>
          <span>🔴 Negative (&gt;40% 🧊🤢)</span>
        </div>
      </div>

      {/* Dish Leaderboard */}
      <div>
        <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
          <Trophy size={18} className="text-yellow-500" />
          Dish Leaderboard
        </h2>
        {leaderboard.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-400 text-sm">
            No vote data yet. Votes will appear here once students start rating dishes.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <ResponsiveContainer width="100%" height={leaderboard.length * 44 + 20}>
              <BarChart
                data={leaderboard}
                layout="vertical"
                margin={{ left: 16, right: 24, top: 4, bottom: 4 }}
              >
                <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={110} />
                <Tooltip
                  formatter={(value) => [value > 0 ? `+${value}` : value, 'Net score']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #f3f4f6', fontSize: 12 }}
                />
                <Bar dataKey="score" radius={[0, 6, 6, 0]}>
                  {leaderboard.map((entry, i) => (
                    <Cell key={i} fill={entry.score > 0 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Weekly Summary */}
      <div>
        <h2 className="font-semibold text-gray-800 mb-3">Weekly Summary</h2>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-700">
                {leaderboard.filter(d => d.score > 0).length}
              </p>
              <p className="text-xs text-green-600 mt-1">Positively rated dishes</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-red-700">
                {leaderboard.filter(d => d.score < 0).length}
              </p>
              <p className="text-xs text-red-600 mt-1">Negatively rated dishes</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">
                {Object.values(heatmap).reduce((sum, d) => sum + d.fire + d.ice + d.nausea, 0)}
              </p>
              <p className="text-xs text-blue-600 mt-1">Total reactions this week</p>
            </div>
          </div>
          {leaderboard.length > 0 && (
            <div className="pt-2 border-t border-gray-50 space-y-1">
              <p className="text-sm text-gray-600">
                🏆 <span className="font-medium">Top dish:</span> {leaderboard[0]?.name} ({leaderboard[0]?.score > 0 ? '+' : ''}{leaderboard[0]?.score})
              </p>
              {leaderboard[leaderboard.length - 1]?.score < 0 && (
                <p className="text-sm text-gray-600">
                  ⚠️ <span className="font-medium">Needs attention:</span> {leaderboard[leaderboard.length - 1]?.name} ({leaderboard[leaderboard.length - 1]?.score})
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}