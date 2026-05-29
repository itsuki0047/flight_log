'use client'
import { useState } from 'react'
import AppShell from '@/components/AppShell'
import { mockFlights, mockAircraft, mockUsers, mockSubjects, mockLaunchMethods } from '@/lib/mock-data'
import { formatDate, formatTime, formatMinutes, flightStatusLabel, flightStatusColor } from '@/lib/utils'
import { Search, Filter } from 'lucide-react'

export default function LogsPage() {
  const [search, setSearch] = useState({ aircraft: '', pilot: '', instructor: '', subject: '' })
  const [filters, setFilters] = useState({ status: '', pic_type: '', category: '', launch_method: '' })

  const filtered = mockFlights.filter(f => {
    if (search.aircraft && !f.aircraft?.registration_number.includes(search.aircraft) && !f.aircraft?.aircraft_type.includes(search.aircraft)) return false
    if (search.pilot && !f.pilot?.name.includes(search.pilot)) return false
    if (search.instructor && !f.instructor?.name.includes(search.instructor)) return false
    if (search.subject && !f.subject?.name.includes(search.subject)) return false
    if (filters.status && f.flight_status !== filters.status) return false
    if (filters.pic_type && f.pic_type !== filters.pic_type) return false
    if (filters.category && f.aircraft_category !== filters.category) return false
    if (filters.launch_method && f.launch_method_id !== filters.launch_method) return false
    return true
  }).sort((a, b) => new Date(b.departure_time).getTime() - new Date(a.departure_time).getTime())

  return (
    <AppShell>
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">全体ログ確認</h1>

        {/* Search & Filter */}
        <div className="bg-white border rounded-xl p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input value={search.aircraft} onChange={e => setSearch(p=>({...p, aircraft: e.target.value}))}
                placeholder="機体" className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm" />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input value={search.pilot} onChange={e => setSearch(p=>({...p, pilot: e.target.value}))}
                placeholder="搭乗者" className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm" />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input value={search.instructor} onChange={e => setSearch(p=>({...p, instructor: e.target.value}))}
                placeholder="教官" className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm" />
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input value={search.subject} onChange={e => setSearch(p=>({...p, subject: e.target.value}))}
                placeholder="科目" className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select value={filters.status} onChange={e => setFilters(p=>({...p, status: e.target.value}))}
              className="border rounded-lg px-3 py-2 text-sm">
              <option value="">フライト状態（全て）</option>
              <option value="launched">飛行中</option>
              <option value="landed">着陸済</option>
              <option value="approved">承認済</option>
              <option value="pending_approval">承認待ち</option>
            </select>
            <select value={filters.pic_type} onChange={e => setFilters(p=>({...p, pic_type: e.target.value}))}
              className="border rounded-lg px-3 py-2 text-sm">
              <option value="">PIC区分（全て）</option>
              <option value="PIC">PIC</option>
              <option value="Dual">Dual</option>
              <option value="Solo">Solo</option>
            </select>
            <select value={filters.category} onChange={e => setFilters(p=>({...p, category: e.target.value}))}
              className="border rounded-lg px-3 py-2 text-sm">
              <option value="">機体カテゴリ（全て）</option>
              <option value="glider">滑空機</option>
              <option value="airplane">固定翼</option>
              <option value="helicopter">回転翼</option>
            </select>
            <select value={filters.launch_method} onChange={e => setFilters(p=>({...p, launch_method: e.target.value}))}
              className="border rounded-lg px-3 py-2 text-sm">
              <option value="">発航方法（全て）</option>
              {mockLaunchMethods.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-500 mb-2">{filtered.length}件</div>

        {/* Table */}
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500">
                  <th className="px-3 py-2 text-left">日付</th>
                  <th className="px-3 py-2 text-left">機体</th>
                  <th className="px-3 py-2 text-left">搭乗者</th>
                  <th className="px-3 py-2 text-left">教官</th>
                  <th className="px-3 py-2 text-left">科目</th>
                  <th className="px-3 py-2 text-left">発航</th>
                  <th className="px-3 py-2 text-left">着陸</th>
                  <th className="px-3 py-2 text-left">飛行時間</th>
                  <th className="px-3 py-2 text-left">発航方法</th>
                  <th className="px-3 py-2 text-left">離高</th>
                  <th className="px-3 py-2 text-left">最高高</th>
                  <th className="px-3 py-2 text-left">状態</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.length === 0 && (
                  <tr><td colSpan={12} className="px-4 py-8 text-center text-gray-400">該当するフライトがありません</td></tr>
                )}
                {filtered.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 whitespace-nowrap">{formatDate(f.departure_time)}</td>
                    <td className="px-3 py-3 font-medium whitespace-nowrap">
                      {f.aircraft?.registration_number}
                      {f.is_edited && <span className="ml-1 text-xs text-amber-600">[編]</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">{f.pilot?.name}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-600">{f.instructor?.name ?? '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{f.subject?.name}</td>
                    <td className="px-3 py-3 whitespace-nowrap font-mono">{formatTime(f.departure_time)}</td>
                    <td className="px-3 py-3 whitespace-nowrap font-mono">{f.arrival_time ? formatTime(f.arrival_time) : '---'}</td>
                    <td className="px-3 py-3 whitespace-nowrap font-mono">{f.flight_time ? formatMinutes(f.flight_time) : '---'}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-600">{f.launch_method?.name}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{f.release_altitude ? `${f.release_altitude}m` : '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{f.max_altitude ? `${f.max_altitude}m` : '—'}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${flightStatusColor(f.flight_status)}`}>
                        {flightStatusLabel(f.flight_status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
