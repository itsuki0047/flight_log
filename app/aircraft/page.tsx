'use client'
import { useState } from 'react'
import AppShell from '@/components/AppShell'
import { mockAircraft } from '@/lib/mock-data'
import type { Aircraft, AircraftCategory, AircraftStatus } from '@/lib/types'
import { formatMinutes, aircraftStatusLabel, aircraftStatusColor, categoryLabel } from '@/lib/utils'
import { Plus, X, Check, Pencil } from 'lucide-react'

const emptyForm = {
  registration_number: '',
  aircraft_type: '',
  aircraft_category: 'glider' as AircraftCategory,
  aircraft_status: 'active' as AircraftStatus,
  is_visible: true,
  aircraft_memo: '',
  aircraft_initial_airframe_time: 0,
  aircraft_initial_flight_count: 0,
  aircraft_initial_takeoff_count: 0,
  aircraft_initial_landing_count: 0,
}

export default function AircraftPage() {
  const [aircraft, setAircraft] = useState<Aircraft[]>(mockAircraft)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  function openNew() {
    setEditId(null)
    setForm(emptyForm)
    setShowForm(true)
  }
  function openEdit(a: Aircraft) {
    setEditId(a.id)
    setForm({
      registration_number: a.registration_number,
      aircraft_type: a.aircraft_type,
      aircraft_category: a.aircraft_category,
      aircraft_status: a.aircraft_status,
      is_visible: a.is_visible,
      aircraft_memo: a.aircraft_memo ?? '',
      aircraft_initial_airframe_time: a.aircraft_initial_airframe_time,
      aircraft_initial_flight_count: a.aircraft_initial_flight_count,
      aircraft_initial_takeoff_count: a.aircraft_initial_takeoff_count,
      aircraft_initial_landing_count: a.aircraft_initial_landing_count,
    })
    setShowForm(true)
  }

  function handleSave() {
    if (!form.registration_number || !form.aircraft_type) {
      alert('機体番号と機種は必須です')
      return
    }
    const now = new Date().toISOString()
    if (editId) {
      setAircraft(prev => prev.map(a => a.id === editId ? { ...a, ...form, registration_number: form.registration_number.toUpperCase(), updated_at: now } : a))
    } else {
      setAircraft(prev => [...prev, {
        id: `a${Date.now()}`,
        ...form,
        registration_number: form.registration_number.toUpperCase(),
        created_at: now,
        updated_at: now,
      }])
    }
    setShowForm(false)
  }

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">機体管理</h1>
          <button onClick={openNew} className="flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-sky-700 transition">
            <Plus className="w-4 h-4" /> 機体追加
          </button>
        </div>

        {showForm && (
          <div className="bg-white border rounded-xl p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">{editId ? '機体編集' : '機体追加'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">機体番号 *</label>
                <input value={form.registration_number} onChange={e => setForm(p=>({...p, registration_number: e.target.value}))}
                  className="w-full border rounded-lg px-3 py-2 text-sm uppercase" placeholder="JA21MA" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">機種 *</label>
                <input value={form.aircraft_type} onChange={e => setForm(p=>({...p, aircraft_type: e.target.value}))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="ASK-21" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">カテゴリ</label>
                <select value={form.aircraft_category} onChange={e => setForm(p=>({...p, aircraft_category: e.target.value as AircraftCategory}))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="glider">滑空機</option>
                  <option value="airplane">固定翼機</option>
                  <option value="helicopter">回転翼機</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">使用状態</label>
                <select value={form.aircraft_status} onChange={e => setForm(p=>({...p, aircraft_status: e.target.value as AircraftStatus}))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="active">使用中</option>
                  <option value="maintenance">整備中</option>
                  <option value="grounded">飛行停止</option>
                  <option value="retired">退役</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">初期機体時間(分)</label>
                <input type="number" value={form.aircraft_initial_airframe_time} onChange={e => setForm(p=>({...p, aircraft_initial_airframe_time: Number(e.target.value)}))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">初期フライト数</label>
                <input type="number" value={form.aircraft_initial_flight_count} onChange={e => setForm(p=>({...p, aircraft_initial_flight_count: Number(e.target.value)}))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">初期離陸回数</label>
                <input type="number" value={form.aircraft_initial_takeoff_count} onChange={e => setForm(p=>({...p, aircraft_initial_takeoff_count: Number(e.target.value)}))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">初期着陸回数</label>
                <input type="number" value={form.aircraft_initial_landing_count} onChange={e => setForm(p=>({...p, aircraft_initial_landing_count: Number(e.target.value)}))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="vis" checked={form.is_visible} onChange={e => setForm(p=>({...p, is_visible: e.target.checked}))} />
                <label htmlFor="vis" className="text-sm">一覧に表示</label>
              </div>
              <div className="col-span-2 md:col-span-3">
                <label className="text-xs text-gray-500 mb-1 block">備考</label>
                <input value={form.aircraft_memo} onChange={e => setForm(p=>({...p, aircraft_memo: e.target.value}))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={handleSave} className="flex items-center gap-2 bg-sky-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-sky-700 transition">
                <Check className="w-4 h-4" /> 保存
              </button>
            </div>
          </div>
        )}

        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500">
                  <th className="px-3 py-2 text-left">機体番号</th>
                  <th className="px-3 py-2 text-left">機種</th>
                  <th className="px-3 py-2 text-left">カテゴリ</th>
                  <th className="px-3 py-2 text-left">状態</th>
                  <th className="px-3 py-2 text-right">機体時間</th>
                  <th className="px-3 py-2 text-right">フライト</th>
                  <th className="px-3 py-2 text-right">離陸</th>
                  <th className="px-3 py-2 text-right">着陸</th>
                  <th className="px-3 py-2 text-center">表示</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {aircraft.map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 font-medium">{a.registration_number}</td>
                    <td className="px-3 py-3">{a.aircraft_type}</td>
                    <td className="px-3 py-3 text-gray-600">{categoryLabel(a.aircraft_category)}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${aircraftStatusColor(a.aircraft_status)}`}>
                        {aircraftStatusLabel(a.aircraft_status)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono">{formatMinutes(a.aircraft_initial_airframe_time)}</td>
                    <td className="px-3 py-3 text-right">{a.aircraft_initial_flight_count}</td>
                    <td className="px-3 py-3 text-right">{a.aircraft_initial_takeoff_count}</td>
                    <td className="px-3 py-3 text-right">{a.aircraft_initial_landing_count}</td>
                    <td className="px-3 py-3 text-center">{a.is_visible ? '○' : '×'}</td>
                    <td className="px-3 py-3 text-right">
                      <button onClick={() => openEdit(a)} className="text-gray-400 hover:text-sky-600">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">※ 機体は物理削除しません。運用を止める場合は状態を「飛行停止」または「退役」に変更してください。</p>
      </div>
    </AppShell>
  )
}
