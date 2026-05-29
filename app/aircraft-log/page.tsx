'use client'
import { useState } from 'react'
import AppShell from '@/components/AppShell'
import { mockAircraftLogEntries, mockAircraft } from '@/lib/mock-data'
import { formatDate, formatTime, formatMinutes } from '@/lib/utils'

export default function AircraftLogPage() {
  const [aircraftId, setAircraftId] = useState('a1')

  const entries = mockAircraftLogEntries
    .filter(e => e.aircraft_id === aircraftId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const totalTime = entries.reduce((s, e) => s + e.flight_time, 0)
  const totalLandings = entries.reduce((s, e) => s + e.landing_count, 0)

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">航空日誌</h1>

        <div className="bg-white border rounded-xl p-4 mb-4 flex gap-3 flex-wrap items-center">
          <select value={aircraftId} onChange={e => setAircraftId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
            {mockAircraft.map(a => <option key={a.id} value={a.id}>{a.registration_number} ({a.aircraft_type})</option>)}
          </select>
          <div className="text-sm text-gray-500 ml-auto">
            期間飛行時間 <span className="font-mono font-bold text-gray-900">{formatMinutes(totalTime)}</span>
            <span className="mx-2">/</span>
            着陸 <span className="font-bold text-gray-900">{totalLandings}回</span>
          </div>
        </div>

        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500">
                  <th className="px-3 py-2 text-left">日付</th>
                  <th className="px-3 py-2 text-left">搭乗者</th>
                  <th className="px-3 py-2 text-left">教官</th>
                  <th className="px-3 py-2 text-left">発航</th>
                  <th className="px-3 py-2 text-left">着陸</th>
                  <th className="px-3 py-2 text-right">飛行時間</th>
                  <th className="px-3 py-2 text-right">離陸</th>
                  <th className="px-3 py-2 text-right">着陸回</th>
                  <th className="px-3 py-2 text-right">機体時間推移</th>
                  <th className="px-3 py-2 text-left">発航方法</th>
                  <th className="px-3 py-2 text-left">不具合/整備メモ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {entries.length === 0 && (
                  <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400">記録がありません</td></tr>
                )}
                {entries.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-3 py-3 whitespace-nowrap">{formatDate(e.date)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{e.pilot_name}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-600">{e.instructor_name ?? '—'}</td>
                    <td className="px-3 py-3 font-mono">{formatTime(e.departure_time)}</td>
                    <td className="px-3 py-3 font-mono">{e.arrival_time ? formatTime(e.arrival_time) : '---'}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatMinutes(e.flight_time)}</td>
                    <td className="px-3 py-3 text-right">{e.takeoff_count}</td>
                    <td className="px-3 py-3 text-right">{e.landing_count}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs whitespace-nowrap">
                      {formatMinutes(e.initial_airframe_time)} → {formatMinutes(e.final_airframe_time)}
                    </td>
                    <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{e.launch_method_name ?? '—'}</td>
                    <td className="px-3 py-3 text-gray-600 text-xs">{e.maintenance_note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
              {entries.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-50 font-semibold text-xs">
                    <td colSpan={5} className="px-3 py-2 text-right">合計</td>
                    <td className="px-3 py-2 text-right font-mono">{formatMinutes(totalTime)}</td>
                    <td className="px-3 py-2 text-right">{entries.reduce((s,e)=>s+e.takeoff_count,0)}</td>
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
