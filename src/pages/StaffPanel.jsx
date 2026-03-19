import { useState,useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { PlusCircle, Upload } from 'lucide-react'
import HostelSelect from '../components/HostelSelect'

export default function StaffPanel() {
  const { profile } = useAuth()
  const [mealType, setMealType] = useState('lunch')
  const [hostelBlock, setHostelBlock] = useState('')
  const [dishes, setDishes] = useState([{ name: '', file: null, preview: null }])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [verifyRoll, setVerifyRoll] = useState('')
  const [verifyMsg, setVerifyMsg] = useState('')
  const [todaysMeals, setTodaysMeals] = useState([])

useEffect(() => {
  let ignore = false
  async function load() {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('meals')
      .select('type, hostel_block')
      .eq('date', today)
    if (!ignore) setTodaysMeals(data || [])
  }
  load()
  return () => { ignore = true }
}, [success])

  function addDish() {
    setDishes(d => [...d, { name: '', file: null, preview: null }])
  }

  function updateDish(i, field, value) {
    setDishes(d => d.map((dish, idx) => idx === i ? { ...dish, [field]: value } : dish))
  }

  function handleFile(i, file) {
    if (!file) return
    const preview = URL.createObjectURL(file)
    setDishes(d => d.map((dish, idx) => idx === i ? { ...dish, file, preview } : dish))
  }

  async function handleSubmit(e) {
  e.preventDefault()
  setLoading(true)
  const today = new Date().toISOString().split('T')[0]

  // Check if this meal already exists
  const { data: existing } = await supabase
    .from('meals')
    .select('id')
    .eq('date', today)
    .eq('type', mealType)
    .eq('hostel_block', hostelBlock)
    .single()

  if (existing) {
    alert(`${hostelBlock} already has a ${mealType} posted for today. Edit or delete it first.`)
    setLoading(false)
    return
  }

  const { data: meal, error } = await supabase
    .from('meals')
    .insert({ date: today, type: mealType, hostel_block: hostelBlock, created_by: profile.id })
    .select()
    .single()

  if (error) {
    alert('Error creating meal')
    setLoading(false)
    return
  }

  for (let i = 0; i < dishes.length; i++) {
    const dish = dishes[i]
    if (!dish.name.trim()) continue
    let photo_url = null

    if (dish.file) {
      const ext = dish.file.name.split('.').pop()
      const path = `dishes/${meal.id}-${i}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('dish-photos')
        .upload(path, dish.file)
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('dish-photos').getPublicUrl(path)
        photo_url = urlData.publicUrl
      }
    }

    await supabase.from('dishes').insert({
      meal_id: meal.id,
      name: dish.name,
      photo_url,
      position: i
    })
  }

  setSuccess(true)
  setDishes([{ name: '', file: null, preview: null }])
  setLoading(false)
  setTimeout(() => setSuccess(false), 3000)
}

  async function handleVerify(e) {
    e.preventDefault()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('roll_number', verifyRoll.trim())
      .single()

    if (error || !data) { setVerifyMsg('Student not found'); return }

    await supabase.from('profiles').update({
      is_verified_eater: true,
      verified_meal_window: mealType,
      verified_at: new Date().toISOString()
    }).eq('id', data.id)

    setVerifyMsg(`✓ ${data.name} verified for ${mealType}`)
    setVerifyRoll('')
  }

  // Add this state at the top with the other useState declarations
const [pollMsg, setPollMsg] = useState('')

// Add this function with the other handlers
async function handleStartPoll() {
  const weekStart = getWeekStart()
  const { data: top3 } = await supabase
    .from('dish_pitches')
    .select('id')
    .eq('week_start', weekStart)
    .order('upvote_count', { ascending: false })
    .limit(3)

  if (!top3 || top3.length < 3) {
    setPollMsg('Need at least 3 pitches to start a poll')
    return
  }

  const { error } = await supabase.from('weekly_polls').insert({
    week_start: weekStart,
    option_ids: top3.map(p => p.id),
    status: 'open'
  })

  setPollMsg(error ? 'Error starting poll' : '✓ Poll started!')
  setTimeout(() => setPollMsg(''), 3000)
}

function getWeekStart() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff)).toISOString().split('T')[0]
}

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-8">
      <h1 className="text-xl font-bold text-gray-900">Staff Panel</h1>

      {/* Post a meal */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Post today's meal</h2>
        {todaysMeals.length > 0 && (
  <div className="bg-gray-50 rounded-xl p-3 mb-2">
    <p className="text-xs font-medium text-gray-500 mb-2">Already posted today:</p>
    <div className="flex flex-wrap gap-2">
      {todaysMeals.map((m, i) => (
        <span key={i} className="text-xs bg-white border border-gray-200 rounded-lg px-2 py-1 text-gray-600 capitalize">
          {m.type} — {m.hostel_block}
        </span>
      ))}
    </div>
  </div>
)}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Meal</label>
              <select value={mealType} onChange={e => setMealType(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Hostel Block</label>
              <HostelSelect value={hostelBlock} onChange={setHostelBlock} />
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Dishes</label>
            {dishes.map((dish, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2">
                <input
                  placeholder={`Dish ${i + 1} name (e.g. Dal Tadka)`}
                  value={dish.name}
                  onChange={e => updateDish(i, 'name', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  <Upload size={14} />
                  {dish.preview ? 'Change photo' : 'Add photo (optional)'}
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleFile(i, e.target.files[0])} />
                </label>
                {dish.preview && <img src={dish.preview} className="w-full h-32 object-cover rounded-lg" />}
              </div>
            ))}
            <button type="button" onClick={addDish}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700">
              <PlusCircle size={16} /> Add another dish
            </button>
          </div>

          {success && <p className="text-green-600 text-sm bg-green-50 px-4 py-2 rounded-xl">✓ Meal posted successfully!</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {loading ? 'Posting...' : 'Post meal'}
          </button>
        </form>
      </div>

      {/* Verify eater */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Verify a student</h2>
        <form onSubmit={handleVerify} className="space-y-3">
          <input
            placeholder="Enter roll number"
            value={verifyRoll}
            onChange={e => setVerifyRoll(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {verifyMsg && <p className="text-sm text-green-600">{verifyMsg}</p>}
          <button type="submit"
            className="w-full bg-green-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-green-700 transition-colors">
            Mark as Verified Eater
          </button>
        </form>
      </div>

      {/* Start Poll */}
<div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
  <h2 className="font-semibold text-gray-800 mb-1">Weekly Poll</h2>
  <p className="text-sm text-gray-400 mb-4">Takes the top 3 pitched dishes and opens voting</p>
  {pollMsg && <p className="text-sm text-green-600 mb-3">{pollMsg}</p>}
  <button
    onClick={handleStartPoll}
    className="w-full bg-purple-600 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-purple-700 transition-colors"
  >
    🗳️ Start this week's poll
  </button>
</div>
    </div>
  )
}