import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Send } from 'lucide-react'

const TAGS = ['taste', 'temperature', 'quantity', 'hygiene']

export default function CommentSection({ mealId }) {
  const { profile } = useAuth()
  const [comments, setComments] = useState([])
  const [body, setBody] = useState('')
  const [tag, setTag] = useState('')
  const [loading, setLoading] = useState(false)


  useEffect(() => {
  let ignore = false

  async function load() {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(name)')
      .eq('meal_id', mealId)
      .order('created_at', { ascending: true })
    if (!ignore) setComments(data || [])
  }

  load()

  const channel = supabase
    .channel(`comments-${mealId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'comments',
      filter: `meal_id=eq.${mealId}`
    }, load)
    .subscribe()

  return () => {
    ignore = true
    supabase.removeChannel(channel)
  }
}, [mealId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!body.trim()) return
    if (!profile?.is_verified_eater) return alert('You need to be a Verified Eater to comment.')
    setLoading(true)
    await supabase.from('comments').insert({
      meal_id: mealId,
      user_id: profile.id,
      body: body.trim(),
      issue_tag: tag || null
    })
    setBody('')
    setTag('')
    setLoading(false)
  }

  const TAG_COLORS = {
    taste: 'bg-orange-50 text-orange-700',
    temperature: 'bg-blue-50 text-blue-700',
    quantity: 'bg-purple-50 text-purple-700',
    hygiene: 'bg-red-50 text-red-700',
  }

  return (
    <div className="mt-3 space-y-3">
      {comments.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">No comments yet. Be the first!</p>
      )}
      {comments.map(c => (
        <div key={c.id} className="flex gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 shrink-0">
            {c.profiles?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-medium text-gray-700">{c.profiles?.name || 'Anonymous'}</span>
              {c.issue_tag && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TAG_COLORS[c.issue_tag]}`}>
                  {c.issue_tag}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">{c.body}</p>
          </div>
        </div>
      ))}

      {/* Comment form */}
      <form onSubmit={handleSubmit} className="pt-2 border-t border-gray-50">
        <div className="flex gap-2 mb-2 flex-wrap">
          {TAGS.map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(tag === t ? '' : t)}
              className={`text-xs px-2 py-1 rounded-full border transition-all ${
                tag === t ? TAG_COLORS[t] + ' border-transparent' : 'border-gray-200 text-gray-500'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !body.trim()}
            className="bg-blue-600 text-white rounded-xl px-3 py-2 disabled:opacity-40 hover:bg-blue-700 transition-colors"
          >
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  )
}