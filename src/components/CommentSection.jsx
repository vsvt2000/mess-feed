import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Send } from 'lucide-react'

const TAGS = ['taste', 'temperature', 'quantity', 'hygiene']
const TAG_COLORS = {
  taste: 'bg-orange-50 text-orange-700 border-orange-200',
  temperature: 'bg-blue-50 text-blue-700 border-blue-200',
  quantity: 'bg-purple-50 text-purple-700 border-purple-200',
  hygiene: 'bg-red-50 text-red-700 border-red-200',
}

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

    // No filter on the subscription — filter client-side instead
    const channel = supabase
      .channel(`comments-${mealId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        async (payload) => {
          // Only handle comments for this meal
          if (payload.new.meal_id !== mealId) return

          // Fetch the profile for the new comment
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', payload.new.user_id)
            .single()

          const newComment = {
            ...payload.new,
            profiles: profileData
          }

          setComments(prev => {
            // Avoid duplicates — replace optimistic comment if it exists
            const exists = prev.some(c => c.id === newComment.id)
            if (exists) return prev.map(c => c.id === newComment.id ? newComment : c)
            // Remove any optimistic placeholder with same body + user
            const withoutOptimistic = prev.filter(c => !c._optimistic)
            return [...withoutOptimistic, newComment]
          })
        }
      )
      .subscribe()

    return () => {
      ignore = true
      supabase.removeChannel(channel)
    }
  }, [mealId])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!body.trim()) return

    const { data: fresh } = await supabase
      .from('profiles')
      .select('is_verified_eater')
      .eq('id', profile?.id)
      .single()

    if (!fresh?.is_verified_eater) {
      alert('You need to be a Verified Eater to comment. Ask mess staff to verify you.')
      return
    }

    // Optimistic update — show immediately
    const optimistic = {
      id: `optimistic-${Date.now()}`,
      meal_id: mealId,
      user_id: profile.id,
      body: body.trim(),
      issue_tag: tag || null,
      created_at: new Date().toISOString(),
      profiles: { name: profile.name },
      _optimistic: true
    }
    setComments(prev => [...prev, optimistic])
    const submittedBody = body.trim()
    const submittedTag = tag
    setBody('')
    setTag('')
    setLoading(true)

    const { error } = await supabase.from('comments').insert({
      meal_id: mealId,
      user_id: profile.id,
      body: submittedBody,
      issue_tag: submittedTag || null
    })

    // If insert failed, remove the optimistic comment
    if (error) {
      setComments(prev => prev.filter(c => !c._optimistic))
      setBody(submittedBody)
      setTag(submittedTag)
      alert('Failed to post comment. Try again.')
    }

    setLoading(false)
  }

  return (
    <div className="mt-3 space-y-3">
      {comments.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-3">No comments yet. Be the first!</p>
      )}

      <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
        {comments.map(c => (
          <div key={c.id} className={`flex gap-2.5 transition-opacity ${c._optimistic ? 'opacity-60' : 'opacity-100'}`}>
            <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
              {c.profiles?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="text-xs font-semibold text-gray-700">{c.profiles?.name || 'Anonymous'}</span>
                {c.issue_tag && (
                  <span className={`badge border ${TAG_COLORS[c.issue_tag]}`}>
                    {c.issue_tag}
                  </span>
                )}
                {c._optimistic && (
                  <span className="text-xs text-gray-400">Sending...</span>
                )}
              </div>
              <p className="text-sm text-gray-600 leading-snug">{c.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="pt-2 border-t border-gray-50 space-y-2">
        <div className="flex gap-1.5 flex-wrap">
          {TAGS.map(t => (
            <button key={t} type="button" onClick={() => setTag(tag === t ? '' : t)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-all font-medium ${
                tag === t ? `${TAG_COLORS[t]}` : 'border-gray-200 text-gray-400 hover:border-gray-300'
              }`}>
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Add a comment..."
            className="input flex-1 py-2"
          />
          <button type="submit" disabled={loading || !body.trim()}
            className="btn-primary px-3 py-2">
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  )
}