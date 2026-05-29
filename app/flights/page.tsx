'use client'
import { useState } from 'react'
import AppShell from '@/components/AppShell'
import { mockFlights, mockAircraft, mockUsers, mockSubjects, mockLaunchMethods } from '@/lib/mock-data'
import type { Flight, PicType } from '@/lib/types'
import { formatTime, formatMinutes, flightStatusLabel, flightStatusColor } from '@/lib/utils'
import { Plus, X, Check } from 'lucide-react'

const instructors = mockUsers.filter(u => u.role === 'instructor' || u.role === 'admin')
const pilots = mockUsers

export default function FlightsPage() {
  const today = new Date().toISOString().split('T')[0]
  const [flights, setFlights] = useState<Flight[]>(mockFlights)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    aircraft_id: '',
    pilot_id: '',
    instructor_id: '',
    copilot_name: '',
    subject_id: '',
    launch_method_id: '',
    departure_place: '大利根飛行場',
    arrival_place: '大利根飛行場',
    pic_type: 'Dual' as PicType,
    flight_content: '',
    flights_memo: '',
  })

  const todayFlights = flights.filter(f => f.departure_time.startsWith(today))
  const inFlight = flights.filter(f => f.flight_status === 'launched')

  function handleLaunch() {
    if (!form.aircraft_id || !form.pilot_id || !form.subject_id || !form.launch_method_id) {
      alert('必須項目を入力してください')
      return
    }
    const now = new Date().toISOString()
    const aircraft = mockAircraft.find(a => a.id === form.aircraft_id)
    const pilot = pilots.find(u => u.id === form.pilot_id)
    const instructor = instructors.find(u => u.id === form.instructor_id)
    const subject = mockSubjects.find(s => s.id === form.subject_id)
    const launchMethod = mockLaunchMethods.find(l => l.id === form.launch_method_id)
    const newFlight: Flight = {
      id: `f${Date.now()}`,
      ...form,
      instructor_id: form.instructor_id || undefined,
      instructor: instructor,
      aircraft,
      pilot,
      subject,
      launch_method: launchMethod,
      departure_time: now,
      landing_count: 0,
      takeoff_count: 1,
      night_landing_count: 0,
      night_takeoff_count: 0,
      flight_status: 'launched',
      aircraft_category: 'glider',
      is_edited: false,
      created_by: 'u1',
      created_at: now,
      updated_at: now,
    }
    setFlights(prev => [newFlight, ...prev])
    setShowForm(false)
    setForm({
      aircraft_id: '', pilot_id: '', instructor_id: '', copilot_name: '',
      subject_id: '', launch_method_id: '',
      departure_place: '大利根飛行場', arrival_place: '大利根飛行場',
      pic_type: 'Dual', flight_content: '', flights_memo: '',
    })
  }

  function handleLand(flightId: string) {
    const now = new Date().toISOString()
    setFlights(prev => prev.map(f => {
      if (f.id !== flightId) return f
      const dep = new Date(f.departure_time)
      const arr = new Date(now)
      const mins = Math.round((arr.getTime() - dep.getTime()) / 60000)
      return { ...f, arrival_time: now, flight_time: mins, flight_status: 'landed', landing_count: 1 }
    }))
  }

  const airports = ['大利根飛行場', '妻沼滑空場', '板倉滑空場', 'その他']

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">発航記録</h1>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-sky-700 transition"
          >
            <Plus className="w-4 h-4" /> 新規発航
          </button>
        </div>

        {/* New flight form */}
        {showForm && (
          <div className="bg-white border rounded-xl p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">発航記録入力</h2>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">機体 *</label>
                <select value={form.aircraft_id} onChange={e => setForm(p => ({...p, aircraft_id: e.target.value}))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">選択</option>
                  {mockAircraft.filter(a => a.aircraft_status === 'active' && a.is_visible).map(a => (
                    <option key={a.id} value={a.id}>{a.registration_number} ({a.aircraft_type})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">搭乗者 *</label>
                <select value={form.pilot_id} onChange={e => setForm(p => ({...p, pilot_id: e.target.value}))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">選択</option>
                  {pilots.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">教官</label>
                <select value={form.instructor_id} onChange={e => setForm(p => ({...p, instructor_id: e.target.value}))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">なし</option>
                  {instructors.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">飛行科目 *</label>
                <select value={form.subject_id} onChange={e => setForm(p => ({...p, subject_id: e.target.value}))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">選択</option>
                  {mockSubjects.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">発航方法 *</label>
                <select value={form.launch_method_id} onChange={e => setForm(p => ({...p, launch_method_id: e.target.value}))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">選択</option>
                  {mockLaunchMethods.filter(l => l.is_active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">PIC区分</label>
                <select value={form.pic_type} onChange={e => setForm(p => ({...p, pic_type: e.target.value as PicType}))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="Dual">同乗教育 (Dual)</option>
                  <option value="Solo">単独 (Solo)</option>
                  <option value="PIC">機長 (PIC)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">出発地</label>
                <select value={form.departure_place} onChange={e => setForm(p => ({...p, departure_place: e.target.value}))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  {airports.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">到着地</label>
                <select value={form.arrival_place} onChange={e => setForm(p => ({...p, arrival_place: e.target.value}))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  {airports.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">同乗者</label>
                <input value={form.copilot_name} onChange={e => setForm(p => ({...p, copilot_name: e.target.value}))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="氏名" />
              </div>
              <div className="col-span-2 md:col-span-3">
                <label className="text-xs text-gray-500 mb-1 block">飛行内容</label>
                <input value={form.flight_content} onChange={e => setForm(p => ({...p, flight_content: e.target.value}))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="訓練内容・経路など" />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={handleLaunch}
                className="flex items-center gap-2 bg-sky-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-sky-700 transition">
                <Check className="w-4 h-4" /> 発航登録
              </button>
            </div>
          </div>
        )}

        {/* In flight */}
        {inFlight.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl mb-6">
            <div className="px-4 py-3 border-b border-blue-200 font-semibold text-blue-800 text-sm">飛行中 ({inFlight.length}件)</div>
            <div className="divide-y divide-blue-100">
              {inFlight.map(f => (
                <div key={f.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{f.aircraft?.registration_number} — {f.pilot?.name}</div>
                    <div className="text-xs text-gray-600">{f.subject?.name} / {f.launch_method?.name} / {formatTime(f.departure_time)}発航</div>
                  </div>
                  <button onClick={() => handleLand(f.id)}
                    className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition">
                    着陸記録
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today's flights */}
        <div className="bg-white rounded-xl border">
          <div className="px-4 py-3 border-b font-semibold text-sm">今日のフライト一覧</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500">
                  <th className="px-4 py-2 text-left">機体</th>
                  <th className="px-4 py-2 text-left">搭乗者</th>
                  <th className="px-4 py-2 text-left">科目</th>
                  <th className="px-4 py-2 text-left">発航</th>
                  <th className="px-4 py-2 text-left">着陸</th>
                  <th className="px-4 py-2 text-left">飛行時間</th>
                  <th className="px-4 py-2 text-left">状態</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {todayFlights.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">本日のフライトはありません</td></tr>
                )}
                {todayFlights.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{f.aircraft?.registration_number}</td>
                    <td className="px-4 py-3">{f.pilot?.name}</td>
                    <td className="px-4 py-3 text-gray-600">{f.subject?.name}</td>
                    <td className="px-4 py-3">{formatTime(f.departure_time)}</td>
                    <td className="px-4 py-3">{f.arrival_time ? formatTime(f.arrival_time) : '---'}</td>
                    <td className="px-4 py-3 font-mono">{f.flight_time ? formatMinutes(f.flight_time) : '---'}</td>
                    <td className="px-4 py-3">
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
