import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import HostelSelect from '../components/HostelSelect'


export default function ProfileSetup() {
  const { user, fetchProfile } = useAuth()
  const [form, setForm] = useState({ name: '', roll_number: '', hostel_block: '' })
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    await supabase.from('profiles').update(form).eq('id', user.id)
    await fetchProfile(user.id)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">👋</div>
          <h1 className="text-xl font-bold text-gray-900">Set up your profile</h1>
          <p className="text-gray-500 text-sm mt-1">One time only, we promise</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
  { label: 'Full name', key: 'name', placeholder: 'Priya Sharma' },
  { label: 'Roll number', key: 'roll_number', placeholder: '21CS101' },
].map(({ label, key, placeholder }) => (
  <div key={key}>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <input
      required
      value={form[key]}
      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
      placeholder={placeholder}
      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </div>
))}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Hostel block</label>
  <HostelSelect
    value={form.hostel_block}
    onChange={val => setForm(f => ({ ...f, hostel_block: val }))}
  />
</div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving...' : "Let's eat →"}
          </button>
        </form>
      </div>
    </div>
  )
}