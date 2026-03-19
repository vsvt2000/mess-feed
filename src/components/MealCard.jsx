import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import CommentSection from './CommentSection'
import { MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react'

const REACTIONS = [
  { type: 'fire', emoji: '🔥', label: 'Delicious' },
  { type: 'ice', emoji: '🧊', label: 'Bland' },
  { type: 'nausea', emoji: '🤢', label: 'Bad' },
]

const MEAL_LABELS = { breakfast: '🌅 Breakfast', lunch: '☀️ Lunch', dinner: '🌙 Dinner' }

export default function MealCard({ meal }) {
  const { profile } = useAuth()
  const [dishes] = useState(meal.dishes || [])
  const [reactions, setReactions] = useState({})
  const [myReactions, setMyReactions] = useState({})
  const [votes, setVotes] = useState({})
  const [myVotes, setMyVotes] = useState({})
  const [showComments, setShowComments] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const scrollRef = useRef(null)

    async function fetchReactions() {
    const dishIds = dishes.map(d => d.id)
    const { data } = await supabase
      .from('reactions')
      .select('*')
      .in('dish_id', dishIds)

    const counts = {}
    const mine = {}
    data?.forEach(r => {
      if (!counts[r.dish_id]) counts[r.dish_id] = {}
      counts[r.dish_id][r.type] = (counts[r.dish_id][r.type] || 0) + 1
      if (r.user_id === profile?.id) mine[r.dish_id] = r.type
    })
    setReactions(counts)
    setMyReactions(mine)
  }

  async function fetchVotes() {
    const dishIds = dishes.map(d => d.id)
    const { data } = await supabase
      .from('votes')
      .select('*')
      .in('dish_id', dishIds)

    const counts = {}
    const mine = {}
    data?.forEach(v => {
      counts[v.dish_id] = (counts[v.dish_id] || 0) + v.value
      if (v.user_id === profile?.id) mine[v.dish_id] = v.value
    })
    setVotes(counts)
    setMyVotes(mine)
  }

useEffect(() => {
  if (dishes.length === 0) return
  let ignore = false

  async function load() {
    const dishIds = dishes.map(d => d.id)

    const { data: reactionData } = await supabase
      .from('reactions')
      .select('*')
      .in('dish_id', dishIds)

    const { data: voteData } = await supabase
      .from('votes')
      .select('*')
      .in('dish_id', dishIds)

    if (!ignore) {
      const counts = {}
      const mine = {}
      reactionData?.forEach(r => {
        if (!counts[r.dish_id]) counts[r.dish_id] = {}
        counts[r.dish_id][r.type] = (counts[r.dish_id][r.type] || 0) + 1
        if (r.user_id === profile?.id) mine[r.dish_id] = r.type
      })
      setReactions(counts)
      setMyReactions(mine)

      const voteCounts = {}
      const myV = {}
      voteData?.forEach(v => {
        voteCounts[v.dish_id] = (voteCounts[v.dish_id] || 0) + v.value
        if (v.user_id === profile?.id) myV[v.dish_id] = v.value
      })
      setVotes(voteCounts)
      setMyVotes(myV)
    }
  }

  load()

  const channel = supabase
    .channel(`meal-${meal.id}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, load)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'votes' }, load)
    .subscribe()

  return () => {
    ignore = true
    supabase.removeChannel(channel)
  }
}, [dishes])



  async function handleReaction(dishId, type) {
    if (!profile?.is_verified_eater) return alert('You need to be a Verified Eater to react.')
    const existing = myReactions[dishId]
    if (existing === type) {
      await supabase.from('reactions').delete().eq('dish_id', dishId).eq('user_id', profile.id)
    } else {
      await supabase.from('reactions').upsert({ dish_id: dishId, user_id: profile.id, type })
    }
    fetchReactions()
  }

  async function handleVote(dishId, value) {
    if (!profile?.is_verified_eater) return alert('You need to be a Verified Eater to vote.')
    const existing = myVotes[dishId]
    if (existing === value) {
      await supabase.from('votes').delete().eq('dish_id', dishId).eq('user_id', profile.id)
    } else {
      await supabase.from('votes').upsert({ dish_id: dishId, user_id: profile.id, value })
    }
    fetchVotes()
  }

  function scrollTo(idx) {
    setActiveIdx(idx)
    scrollRef.current?.children[idx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }

  const activeDish = dishes[activeIdx]

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Meal header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <span className="font-semibold text-gray-900">{MEAL_LABELS[meal.type] || meal.type}</span>
        <span className="text-xs text-gray-400">{meal.hostel_block}</span>
      </div>

      {/* Dish carousel */}
      {dishes.length > 0 ? (
        <>
          <div className="relative">
            <div
              ref={scrollRef}
              className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
              style={{ scrollbarWidth: 'none' }}
              onScroll={e => {
                const idx = Math.round(e.target.scrollLeft / e.target.offsetWidth)
                setActiveIdx(idx)
              }}
            >
              {dishes.map(dish => (
                <div key={dish.id} className="min-w-full snap-center">
                  {dish.photo_url ? (
                    <img src={dish.photo_url} alt={dish.name} className="w-full h-56 object-cover" />
                  ) : (
                    <div className="w-full h-56 bg-gradient-to-br from-orange-50 to-yellow-50 flex items-center justify-center">
                      <span className="text-6xl">🍛</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Prev/Next */}
            {dishes.length > 1 && (
              <>
                {activeIdx > 0 && (
                  <button onClick={() => scrollTo(activeIdx - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur rounded-full p-1 shadow">
                    <ChevronLeft size={16} />
                  </button>
                )}
                {activeIdx < dishes.length - 1 && (
                  <button onClick={() => scrollTo(activeIdx + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur rounded-full p-1 shadow">
                    <ChevronRight size={16} />
                  </button>
                )}
              </>
            )}

            {/* Dots */}
            {dishes.length > 1 && (
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {dishes.map((_, i) => (
                  <button key={i} onClick={() => scrollTo(i)}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${i === activeIdx ? 'bg-white' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Dish name */}
          {activeDish && (
            <div className="px-4 pt-3">
              <h3 className="font-semibold text-gray-900">{activeDish.name}</h3>
            </div>
          )}

          {/* Reactions */}
          {activeDish && (
            <div className="px-4 pt-2 pb-1 flex items-center gap-2">
              {REACTIONS.map(({ type, emoji, label }) => (
                <button
                  key={type}
                  onClick={() => handleReaction(activeDish.id, type)}
                  title={label}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-all ${
                    myReactions[activeDish.id] === type
                      ? 'bg-blue-50 border-blue-300 font-medium'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="text-xs text-gray-600">
                    {reactions[activeDish.id]?.[type] || 0}
                  </span>
                </button>
              ))}

              <div className="ml-auto flex items-center gap-1">
                <button
                  onClick={() => handleVote(activeDish.id, 1)}
                  className={`px-2 py-1 rounded-lg text-sm border transition-all ${myVotes[activeDish.id] === 1 ? 'bg-green-50 border-green-300' : 'border-gray-200'}`}
                >👍 {votes[activeDish.id] > 0 ? `+${votes[activeDish.id]}` : votes[activeDish.id] || ''}</button>
                <button
                  onClick={() => handleVote(activeDish.id, -1)}
                  className={`px-2 py-1 rounded-lg text-sm border transition-all ${myVotes[activeDish.id] === -1 ? 'bg-red-50 border-red-300' : 'border-gray-200'}`}
                >👎</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="px-4 py-8 text-center text-gray-400 text-sm">No dishes posted yet</div>
      )}

      {/* Comments toggle */}
      <div className="px-4 py-3 border-t border-gray-50">
        <button
          onClick={() => setShowComments(s => !s)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <MessageCircle size={16} />
          {showComments ? 'Hide comments' : 'View comments'}
        </button>
        {showComments && <CommentSection mealId={meal.id} />}
      </div>
    </div>
  )
}