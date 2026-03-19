import hostels from '../config/hostels.json'

export default function HostelSelect({ value, onChange, className = '' }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${className}`}
    >
      <option value="">Select hostel block</option>
      {hostels.hostels.map(h => (
        <option key={h.id} value={h.label}>
          {h.label}
        </option>
      ))}
    </select>
  )
}