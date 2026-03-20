/* eslint-disable no-unused-vars */
import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import CommentSection from './CommentSection'
import { MessageCircle, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, Flame, Snowflake, Frown, ChefHat } from 'lucide-react'

const REACTIONS = [
  { type: 'fire', icon: Flame, label: 'Delicious', activeClass: 'bg-orange-50 border-orange-300 text-orange-600' },
  { type: 'ice', icon: Snowflake, label: 'Bland', activeClass: 'bg-blue-50 border-blue-300 text-blue-600' },
  { type: 'nausea', icon: Frown, label: 'Bad', activeClass: 'bg-red-50 border-red-300 text-red-600' },
]

const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' }
const MEAL_COLORS = { breakfast: 'bg-amber-50 text-amber-700', lunch: 'bg-blue-50 text-blue-700', dinner: 'bg-indigo-50 text-indigo-700' }


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
  const { data: fresh } = await supabase
    .from('profiles')
    .select('is_verified_eater')
    .eq('id', profile?.id)
    .single()

  if (!fresh?.is_verified_eater) {
    alert('You need to be a Verified Eater to react. Ask the mess staff to verify you at the entry.')
    return
  }

  const existing = myReactions[dishId]
  if (existing === type) {
    await supabase.from('reactions').delete()
      .eq('dish_id', dishId).eq('user_id', profile.id)
  } else {
    await supabase.from('reactions').upsert({
      dish_id: dishId, user_id: profile.id, type
    })
  }
  fetchReactions()
}

async function handleVote(dishId, value) {
  const { data: fresh } = await supabase
    .from('profiles')
    .select('is_verified_eater')
    .eq('id', profile?.id)
    .single()

  if (!fresh?.is_verified_eater) {
    alert('You need to be a Verified Eater to vote. Ask the mess staff to verify you at the entry.')
    return
  }

  const existing = myVotes[dishId]
  if (existing === value) {
    await supabase.from('votes').delete()
      .eq('dish_id', dishId).eq('user_id', profile.id)
  } else {
    await supabase.from('votes').upsert({
      dish_id: dishId, user_id: profile.id, value
    })
  }
  fetchVotes()
}
  function scrollTo(idx) {
    setActiveIdx(idx)
    scrollRef.current?.children[idx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }

  const activeDish = dishes[activeIdx]

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b border-gray-50">
        <div className="flex items-center gap-2">
          <span className={`badge ${MEAL_COLORS[meal.type]}`}>
            {MEAL_LABELS[meal.type] || meal.type}
          </span>
          <span className="text-xs text-gray-400">{meal.hostel_block}</span>
        </div>
        <span className="text-xs text-gray-300">
          {new Date(meal.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Carousel */}
      {dishes.length > 0 ? (
        <>
          <div className="relative bg-gray-100">
            <div
              ref={scrollRef}
              className="flex overflow-x-auto snap-x snap-mandatory"
              style={{ scrollbarWidth: 'none' }}
              onScroll={e => setActiveIdx(Math.round(e.target.scrollLeft / e.target.offsetWidth))}
            >
              {dishes.map(dish => (
                <div key={dish.id} className="min-w-full snap-center">
                  {dish.photo_url
                    ? <img src={dish.photo_url} alt={dish.name} className="w-full h-56 object-cover" />
                    : (
                      <div className="w-full h-56 bg-gradient-to-br from-gray-100 to-gray-200 flex flex-col items-center justify-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                          <ChefHat size={20} className="text-gray-500" />
                        </div>
                        <p className="text-sm text-gray-400">No photo yet</p>
                      </div>
                    )
                  }
                </div>
              ))}
            </div>

            {dishes.length > 1 && (
              <>
                {activeIdx > 0 && (
                  <button onClick={() => scrollTo(activeIdx - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1.5 shadow-sm border border-gray-100">
                    <ChevronLeft size={14} className="text-gray-700" />
                  </button>
                )}
                {activeIdx < dishes.length - 1 && (
                  <button onClick={() => scrollTo(activeIdx + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1.5 shadow-sm border border-gray-100">
                    <ChevronRight size={14} className="text-gray-700" />
                  </button>
                )}
                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                  {dishes.map((_, i) => (
                    <button key={i} onClick={() => scrollTo(i)}
                      className={`rounded-full transition-all ${i === activeIdx ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/60'}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Dish info + interactions */}
          {activeDish && (
            <div className="px-4 pt-3 pb-1">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-base">{activeDish.name}</h3>
                  {dishes.length > 1 && (
                    <p className="text-xs text-gray-400 mt-0.5">{activeIdx + 1} of {dishes.length} dishes</p>
                  )}
                </div>
                {/* Vote buttons */}
                <div className="flex items-center gap-1.5">
                  <button onClick={() => handleVote(activeDish.id, 1)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      myVotes[activeDish.id] === 1 ? 'bg-green-50 border-green-300 text-green-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    <ThumbsUp size={12} />
                    <span>{votes[activeDish.id] > 0 ? `+${votes[activeDish.id]}` : votes[activeDish.id] || '0'}</span>
                  </button>
                  <button onClick={() => handleVote(activeDish.id, -1)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      myVotes[activeDish.id] === -1 ? 'bg-red-50 border-red-300 text-red-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    <ThumbsDown size={12} />
                  </button>
                </div>
              </div>

              {/* Reaction buttons */}
              <div className="flex items-center gap-2 pb-3 border-b border-gray-50">
                {REACTIONS.map(({ type, icon: Icon, label, activeClass }) => (
                  <button key={type} onClick={() => handleReaction(activeDish.id, type)} title={label}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      myReactions[activeDish.id] === type ? activeClass : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                    }`}>
                    <Icon size={12} />
                    <span>{label}</span>
                    <span className="font-semibold">{reactions[activeDish.id]?.[type] || 0}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="px-4 py-8 text-center text-gray-400 text-sm">No dishes added yet</div>
      )}

      {/* Comments */}
      <div className="px-4 py-3">
        <button onClick={() => setShowComments(s => !s)}
          className="flex items-center gap-2 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors">
          <MessageCircle size={14} />
          {showComments ? 'Hide comments' : 'Comments'}
        </button>
        {showComments && <CommentSection mealId={meal.id} />}
      </div>
    </div>
  )
}