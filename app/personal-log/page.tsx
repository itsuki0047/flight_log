'use client'
import { useState } from 'react'
import AppShell from '@/components/AppShell'
import { mockPersonalLogEntries, mockUsers } from '@/lib/mock-data'
import { formatDate, formatMinutes } from '@/lib/utils'

export default function PersonalLogPage() {
  const [userId, setUserId] = useState('u2')
  const [category, setCategory] = useState('')

  const entries = mockPersonalLogEntries.filter(e => {
    if (e.user_id !== userId) return false
    if (category && e.aircraft_category !== category) return false
    return true
  })

  const totalFlightTime = entries.reduce((s, e) => s + e.total_flight_time, 0)
  const totalDual = entries.reduce((s, e) => s + (e.dual_instruction_time ?? 0), 0)
  const totalSolo = entries.reduce((s, e) => s + (e.solo_time ?? 0), 0)
  const totalLandings = entries.reduce((s, e) => s + e.landing_count, 0)

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">個人ログ</h1>

        {/* Filters */}
        <div className="bg-white border rounded-xl p-4 mb-4 flex gap-3 flex-wrap">
          <select value={userId} onChange={e => setUserId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            {mockUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select value={category} onChange={e => setCategory(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">全カテゴリ</option>
            <option value="glider">滑空機</option>
            <option value="airplane">固定翼</option>
            <option value="helicopter">回転翼</option>
          </select>
        </div>

        {/* Cumulative */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: '総飛行時間', val: formatMinutes(totalFlightTime) },
            { label: '同乗教育時間', val: formatMinutes(totalDual) },
            { label: '単独飛行時間', val: formatMinutes(totalSolo) },
            { label: '着陸回数', val: `${totalLandings}回` },
          ].map(s => (
            <div key={s.label} className="bg-white border rounded-xl p-3">
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className="text-xl font-bold font-mono mt-1">{s.val}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500">
                  <th className="px-3 py-2 text-left">日付</th>
                  <th className="px-3 py-2 text-left">型式</th>
                  <th className="px-3 py-2 text-left">登録記号</th>
                  <th className="px-3 py-2 text-left">出発/到着</th>
                  <th className="px-3 py-2 text-right">飛行時間</th>
                  <th className="px-3 py-2 text-right">同乗教育</th>
                  <th className="px-3 py-2 text-right">単独</th>
                  <th className="px-3 py-2 text-right">着陸</th>
                  <th className="px-3 py-2 text-left">発航方法</th>
                  <th className="px-3 py-2 text-left">教官</th>
                  <th className="px-3 py-2 text-left">飛行内容</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.length === 0 && (
                  <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400">ログがありません</td></tr>
                )}
                {entries.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 whitespace-nowrap">{formatDate(e.date)}</td>
                    <td className="px-3 py-3">{e.aircraft_type}</td>
                    <td className="px-3 py-3 font-medium">{e.registration_number}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{e.departure_place}→{e.arrival_place}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatMinutes(e.total_flight_time)}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatMinutes(e.dual_instruction_time)}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatMinutes(e.solo_time)}</td>
                    <td className="px-3 py-3 text-right">{e.landing_count}</td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{e.launch_method_name ?? '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{e.instructor_name ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{e.flight_content ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
              {entries.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 font-semibold text-xs">
                    <td colSpan={4} className="px-3 py-2 text-right">合計</td>
                    <td className="px-3 py-2 text-right font-mono">{formatMinutes(totalFlightTime)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatMinutes(totalDual)}</td>
                    <td className="px-3 py-2 text-right font-mono">{formatMinutes(totalSolo)}</td>
                    <td className="px-3 py-2 text-right">{totalLandings}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
