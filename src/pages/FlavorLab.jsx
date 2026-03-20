import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { FlaskConical, ThumbsUp, Trophy } from 'lucide-react'

const CUISINES = ['North Indian', 'South Indian', 'Chinese', 'Continental', 'Street Food', 'Dessert']
const COSTS = ['low', 'medium', 'high']

export default function FlavorLab() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('board')
  const [pitches, setPitches] = useState([])
  const [poll, setPoll] = useState(null)
  const [pollPitches, setPollPitches] = useState([])
  const [pollVotes, setPollVotes] = useState({})
  const [myPollVote, setMyPollVote] = useState(null)
  const [myPitchVotes, setMyPitchVotes] = useState([])
  const [form, setForm] = useState({ name: '', cuisine_type: '', cost_bracket: 'medium', why: '' })
  const [loading, setLoading] = useState(false)
  const [submitMsg, setSubmitMsg] = useState('')

   function getWeekStart() {
    const now = new Date()
  const day = now.getDay() // 0 = Sunday, 1 = Monday...
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
  }

  useEffect(() => {
    let ignore = false

    async function load() {
      const weekStart = getWeekStart()

      const { data: pitchData } = await supabase
      .from('dish_pitches')
      .select('*, profiles(name)')
      .order('upvote_count', { ascending: false })

      const { data: pollData } = await supabase
        .from('weekly_polls')
        .select('*')
        .eq('week_start', weekStart)
        .eq('status', 'open')
        .single()

      const { data: myVoteData } = await supabase
        .from('pitch_votes')
        .select('pitch_id')
        .eq('user_id', profile?.id)

      if (!ignore) {
        setPitches(pitchData || [])
        setMyPitchVotes(myVoteData?.map(v => v.pitch_id) || [])

        if (pollData) {
          setPoll(pollData)
          const options = pitchData?.filter(p => pollData.option_ids?.includes(p.id)) || []
          setPollPitches(options)

          const { data: pVotes } = await supabase
            .from('poll_votes')
            .select('chosen_pitch_id')
            .eq('poll_id', pollData.id)

          const { data: myPVote } = await supabase
            .from('poll_votes')
            .select('chosen_pitch_id')
            .eq('poll_id', pollData.id)
            .eq('user_id', profile?.id)
            .single()

          if (!ignore) {
            const counts = {}
            pVotes?.forEach(v => {
              counts[v.chosen_pitch_id] = (counts[v.chosen_pitch_id] || 0) + 1
            })
            setPollVotes(counts)
            setMyPollVote(myPVote?.chosen_pitch_id || null)
          }
        }
      }
    }

    load()
    return () => { ignore = true }
  }, [profile?.id, tab])


  async function handlePitchVote(pitchId) {
    if (!profile?.is_verified_eater) return alert('You need to be a Verified Eater to vote.')
    const already = myPitchVotes.includes(pitchId)
    if (already) {
      await supabase.from('pitch_votes').delete()
        .eq('pitch_id', pitchId).eq('user_id', profile.id)
      await supabase.from('dish_pitches').update({ upvote_count: pitches.find(p => p.id === pitchId).upvote_count - 1 }).eq('id', pitchId)
      setMyPitchVotes(v => v.filter(id => id !== pitchId))
      setPitches(ps => ps.map(p => p.id === pitchId ? { ...p, upvote_count: p.upvote_count - 1 } : p))
    } else {
      await supabase.from('pitch_votes').insert({ pitch_id: pitchId, user_id: profile.id })
      await supabase.from('dish_pitches').update({ upvote_count: pitches.find(p => p.id === pitchId).upvote_count + 1 }).eq('id', pitchId)
      setMyPitchVotes(v => [...v, pitchId])
      setPitches(ps => ps.map(p => p.id === pitchId ? { ...p, upvote_count: p.upvote_count + 1 } : p))
    }
  }

  async function handlePollVote(pitchId) {
    if (!profile?.is_verified_eater) return alert('You need to be a Verified Eater to vote.')
    if (myPollVote) return
    await supabase.from('poll_votes').insert({
      poll_id: poll.id,
      user_id: profile.id,
      chosen_pitch_id: pitchId
    })
    setMyPollVote(pitchId)
    setPollVotes(v => ({ ...v, [pitchId]: (v[pitchId] || 0) + 1 }))
  }

  async function handleSubmitPitch(e) {
    e.preventDefault()
    if (!profile?.is_verified_eater) return alert('You need to be a Verified Eater to pitch a dish.')
    if (form.why.length > 100) return
    setLoading(true)
    const { error } = await supabase.from('dish_pitches').insert({
      ...form,
      user_id: profile.id,
      week_start: getWeekStart()
    })
    if (!error) {
      setSubmitMsg('✓ Pitch submitted!')
      setForm({ name: '', cuisine_type: '', cost_bracket: 'medium', why: '' })
      setTab('board')
    }
    setLoading(false)
    setTimeout(() => setSubmitMsg(''), 3000)
  }

  const totalPollVotes = Object.values(pollVotes).reduce((a, b) => a + b, 0)

  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <FlaskConical size={22} className="text-blue-600" />
        <h1 className="text-xl font-bold text-gray-900">Flavor Lab</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
        {[
          { id: 'board', label: 'Community Board' },
          { id: 'poll', label: '🗳️ This Week\'s Poll' },
          { id: 'pitch', label: '+ Pitch a Dish' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Community Board */}
      {tab === 'board' && (
        <div className="space-y-3">
          {pitches.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <FlaskConical size={36} className="mx-auto mb-3 opacity-30" />
              <p>No pitches this week yet.</p>
              <p className="text-sm mt-1">Be the first to pitch a dish!</p>
            </div>
          )}
          {pitches.map((pitch, i) => (
            <div key={pitch.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-3">
              <div className={`text-lg font-bold w-7 shrink-0 ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-orange-400' : 'text-gray-300'}`}>
                #{i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{pitch.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{pitch.cuisine_type}</span>
                      <span className="text-xs text-gray-300">•</span>
                      <span className={`text-xs font-medium ${
                        pitch.cost_bracket === 'low' ? 'text-green-600' :
                        pitch.cost_bracket === 'medium' ? 'text-yellow-600' : 'text-red-500'
                      }`}>
                        {'₹'.repeat(pitch.cost_bracket === 'low' ? 1 : pitch.cost_bracket === 'medium' ? 2 : 3)}
                      </span>
                    </div>
                    {pitch.why && <p className="text-sm text-gray-500 mt-1">{pitch.why}</p>}
                    <p className="text-xs text-gray-400 mt-1">by {pitch.profiles?.name}</p>
                  </div>
                  <button
                    onClick={() => handlePitchVote(pitch.id)}
                    className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border transition-all shrink-0 ${
                      myPitchVotes.includes(pitch.id)
                        ? 'bg-blue-50 border-blue-300 text-blue-600'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <ThumbsUp size={14} />
                    <span className="text-xs font-semibold">{pitch.upvote_count}</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Poll */}
      {tab === 'poll' && (
        <div>
          {!poll ? (
            <div className="text-center py-16 text-gray-400">
              <Trophy size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No active poll this week</p>
              <p className="text-sm mt-1">The mess manager will start one soon</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">
                {myPollVote ? 'You voted! Here are the live results.' : 'Vote for the dish you want on Wednesday\'s menu.'}
              </p>
              {pollPitches.map(pitch => {
                const count = pollVotes[pitch.id] || 0
                const pct = totalPollVotes > 0 ? Math.round((count / totalPollVotes) * 100) : 0
                const isWinner = myPollVote && count === Math.max(...Object.values(pollVotes))
                return (
                  <button
                    key={pitch.id}
                    onClick={() => handlePollVote(pitch.id)}
                    disabled={!!myPollVote}
                    className={`w-full text-left bg-white rounded-2xl border shadow-sm p-4 transition-all ${
                      myPollVote === pitch.id ? 'border-blue-400 ring-2 ring-blue-100' :
                      isWinner ? 'border-yellow-300' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900">
                        {isWinner && '🏆 '}{pitch.name}
                      </span>
                      {myPollVote && <span className="text-sm font-bold text-gray-700">{pct}%</span>}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{pitch.why}</p>
                    {myPollVote && (
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-500 ${
                            myPollVote === pitch.id ? 'bg-blue-500' : 'bg-gray-300'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    )}
                  </button>
                )
              })}
              <p className="text-xs text-center text-gray-400 mt-2">{totalPollVotes} vote{totalPollVotes !== 1 ? 's' : ''} so far</p>
            </div>
          )}
        </div>
      )}

      {/* Pitch form */}
      {tab === 'pitch' && (
        <form onSubmit={handleSubmitPitch} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dish name</label>
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Chole Bhature"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine type</label>
            <select value={form.cuisine_type} onChange={e => setForm(f => ({ ...f, cuisine_type: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select cuisine</option>
              {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cost bracket</label>
            <div className="flex gap-2">
              {COSTS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, cost_bracket: c }))}
                  className={`flex-1 py-2 text-sm rounded-xl border transition-all capitalize ${
                    form.cost_bracket === c ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium' : 'border-gray-200 text-gray-500'
                  }`}>
                  {c === 'low' ? '₹ Low' : c === 'medium' ? '₹₹ Medium' : '₹₹₹ High'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Why we need this
              <span className={`ml-2 text-xs ${form.why.length > 100 ? 'text-red-500' : 'text-gray-400'}`}>
                {form.why.length}/100
              </span>
            </label>
            <textarea required value={form.why} onChange={e => setForm(f => ({ ...f, why: e.target.value }))}
              placeholder="Make your case in 100 characters..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          {submitMsg && <p className="text-green-600 text-sm bg-green-50 px-4 py-2 rounded-xl">{submitMsg}</p>}
          <button type="submit" disabled={loading || form.why.length > 100}
            className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? 'Submitting...' : 'Submit pitch'}
          </button>
        </form>
      )}
    </div>
  )
}