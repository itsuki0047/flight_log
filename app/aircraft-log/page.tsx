'use client'
import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { Card, CardHeader, Button, Field, TextInput, Select, Modal, Page, PageTitle, Empty, Chip } from '@/components/ui'
import { listFlights, listAircraft, deriveAircraftLogEntries } from '@/lib/db'
import type { AircraftLogEntry, Aircraft, Flight } from '@/lib/types'
import { formatDate, formatTime, formatMinutes } from '@/lib/utils'
import { FileOutput, Wrench, TrendingUp, ChevronRight, CalendarDays } from 'lucide-react'

export default function AircraftLogPage() {
  const [aircraftId, setAircraftId] = useState('a1')
  const [flights, setFlights] = useState<Flight[]>([])
  const [aircraftList, setAircraftList] = useState<Aircraft[]>([])
  useEffect(() => {
    listFlights().then(setFlights).catch(err => console.error(err))
    listAircraft().then(a => {
      setAircraftList(a)
      if (a.length && !a.some(x => x.id === 'a1')) setAircraftId(a[0].id)
    }).catch(() => {})
  }, [])
  const allEntries = useMemo(() => deriveAircraftLogEntries(flights, aircraftList), [flights, aircraftList])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [detail, setDetail] = useState<AircraftLogEntry | null>(null)
  const [exporting, setExporting] = useState(false)

  const aircraft = aircraftList.find(a => a.id === aircraftId)

  const entries = useMemo(() => allEntries
    .filter(e => {
      if (e.aircraft_id !== aircraftId) return false
      if (from && e.date < from) return false
      if (to && e.date > to) return false
      return true
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.departure_time.localeCompare(a.departure_time)),
  [allEntries, aircraftId, from, to])

  // 日付ごとの発数と合計時間
  const daily = useMemo(() => {
    const map = new Map<string, { flights: number; minutes: number; landings: number }>()
    for (const e of entries) {
      const d = map.get(e.date) ?? { flights: 0, minutes: 0, landings: 0 }
      d.flights += 1
      d.minutes += e.flight_time
      d.landings += e.landing_count
      map.set(e.date, d)
    }
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [entries])

  const totalTime = entries.reduce((s, e) => s + e.flight_time, 0)
  const totalLandings = entries.reduce((s, e) => s + e.landing_count, 0)
  const latestAirframe = entries[0]?.final_airframe_time

  async function exportPdf() {
    setExporting(true)
    try {
      const { downloadAircraftLogPdf } = await import('@/lib/pdf/logbook')
      await downloadAircraftLogPdf([...entries].reverse(), aircraft?.registration_number ?? '', aircraft?.aircraft_type ?? '')
    } catch (err) {
      alert(`PDF生成に失敗しました: ${err instanceof Error ? err.message : err}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <AppShell>
      <Page>
        <PageTitle action={
          <Button onClick={exportPdf} disabled={exporting || entries.length === 0}>
            <FileOutput className="w-4 h-4" />
            {exporting ? '生成中…' : 'PDF出力'}
          </Button>
        }>航空日誌</PageTitle>

        {/* 検索条件 */}
        <Card className="p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Field label="機体" className="col-span-2 md:col-span-1">
              <Select value={aircraftId} onChange={e => setAircraftId(e.target.value)}>
                {aircraftList.map(a => <option key={a.id} value={a.id}>{a.registration_number} ({a.aircraft_type})</option>)}
              </Select>
            </Field>
            <Field label="期間（から）"><TextInput type="date" value={from} onChange={e => setFrom(e.target.value)} /></Field>
            <Field label="期間（まで）"><TextInput type="date" value={to} onChange={e => setTo(e.target.value)} /></Field>
          </div>
        </Card>

        {/* サマリ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            ['期間フライト数', `${entries.length}回`],
            ['期間飛行時間', formatMinutes(totalTime)],
            ['期間着陸回数', `${totalLandings}回`],
            ['最新機体時間', latestAirframe != null ? formatMinutes(latestAirframe) : '—'],
          ].map(([k, v]) => (
            <Card key={k} className="p-3">
              <div className="text-[11px] text-slate-500">{k}</div>
              <div className="text-lg font-bold font-mono mt-0.5">{v}</div>
            </Card>
          ))}
        </div>

        {/* 日別集計（機体×日付ごとの発数と時間） */}
        <Card className="mb-4 overflow-hidden">
          <CardHeader icon={CalendarDays} title={`日別集計（${aircraft?.registration_number ?? ''}）`} />
          {daily.length === 0 ? (
            <Empty>記録がありません</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs text-slate-500">
                    <th className="px-3 py-2 text-left">日付</th>
                    <th className="px-3 py-2 text-right">発数</th>
                    <th className="px-3 py-2 text-right">飛行時間</th>
                    <th className="px-3 py-2 text-right">着陸回数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {daily.map(([date, d]) => (
                    <tr key={date} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(date)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums font-medium">{d.flights}発</td>
                      <td className="px-3 py-2.5 text-right font-mono">{formatMinutes(d.minutes)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{d.landings}回</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* モバイル: カード */}
        <div className="md:hidden space-y-2.5">
          {entries.length === 0 && <Card><Empty>記録がありません</Empty></Card>}
          {entries.map(e => (
            <Card key={e.id} className="p-4">
              <button className="w-full text-left" onClick={() => setDetail(e)}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">{formatDate(e.date)}</span>
                  <div className="flex items-center gap-1.5">
                    {e.maintenance_note && <Chip color="yellow"><Wrench className="w-3 h-3 mr-0.5" />整備メモ</Chip>}
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
                <div className="text-sm font-bold">
                  {e.pilot_name}
                  {e.instructor_name && <span className="font-normal text-slate-500"> / {e.instructor_name}</span>}
                  <span className="ml-2 font-mono">{formatMinutes(e.flight_time)}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {formatTime(e.departure_time)}-{e.arrival_time ? formatTime(e.arrival_time) : ''} ・ 機体時間 {formatMinutes(e.final_airframe_time)}
                </div>
              </button>
            </Card>
          ))}
        </div>

        {/* デスクトップ: テーブル */}
        <Card className="hidden md:block overflow-hidden">
          <CardHeader icon={TrendingUp} title={`${aircraft?.registration_number ?? ''} の運航記録`} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500">
                  <th className="px-3 py-2.5 text-left">日付</th>
                  <th className="px-3 py-2.5 text-left">搭乗者</th>
                  <th className="px-3 py-2.5 text-left">教官</th>
                  <th className="px-3 py-2.5 text-left">時刻</th>
                  <th className="px-3 py-2.5 text-right">飛行時間</th>
                  <th className="px-3 py-2.5 text-right">離陸</th>
                  <th className="px-3 py-2.5 text-right">着陸</th>
                  <th className="px-3 py-2.5 text-right">機体時間推移</th>
                  <th className="px-3 py-2.5 text-left">発航方法</th>
                  <th className="px-3 py-2.5 text-left">不具合/整備メモ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.length === 0 && (
                  <tr><td colSpan={10}><Empty>記録がありません</Empty></td></tr>
                )}
                {entries.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setDetail(e)}>
                    <td className="px-3 py-3 whitespace-nowrap">{formatDate(e.date)}</td>
                    <td className="px-3 py-3 whitespace-nowrap font-medium">{e.pilot_name}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">{e.instructor_name ?? '—'}</td>
                    <td className="px-3 py-3 font-mono text-xs whitespace-nowrap">{formatTime(e.departure_time)}-{e.arrival_time ? formatTime(e.arrival_time) : ''}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatMinutes(e.flight_time)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{e.takeoff_count}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{e.landing_count}</td>
                    <td className="px-3 py-3 text-right font-mono text-xs whitespace-nowrap">
                      {formatMinutes(e.initial_airframe_time)} → {formatMinutes(e.final_airframe_time)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">{e.launch_method_name ?? '—'}</td>
                    <td className="px-3 py-3 text-xs text-slate-600 max-w-44 truncate">{e.maintenance_note ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
              {entries.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 font-semibold text-xs">
                    <td colSpan={4} className="px-3 py-2.5 text-right">合計</td>
                    <td className="px-3 py-2.5 text-right font-mono">{formatMinutes(totalTime)}</td>
                    <td className="px-3 py-2.5 text-right">{entries.reduce((s, e) => s + e.takeoff_count, 0)}</td>
                    <td className="px-3 py-2.5 text-right">{totalLandings}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>

        {/* 詳細モーダル */}
        <Modal open={!!detail} onClose={() => setDetail(null)} title="運航記録 詳細">
          {detail && (
            <div className="space-y-3">
              <div className="font-bold">{detail.registration_number} <span className="font-normal text-slate-500">{detail.aircraft_type}</span></div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['日付', formatDate(detail.date)],
                  ['搭乗者', detail.pilot_name],
                  ['教官', detail.instructor_name ?? '—'],
                  ['区間', `${detail.departure_place} → ${detail.arrival_place}`],
                  ['時刻', `${formatTime(detail.departure_time)} - ${detail.arrival_time ? formatTime(detail.arrival_time) : ''}`],
                  ['飛行時間', formatMinutes(detail.flight_time)],
                  ['機体時間', `${formatMinutes(detail.initial_airframe_time)} → ${formatMinutes(detail.final_airframe_time)}`],
                  ['離着陸', `${detail.takeoff_count}回 / ${detail.landing_count}回`],
                  ['発航方法', detail.launch_method_name ?? '—'],
                  ['飛行内容', detail.flight_content ?? '—'],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="bg-slate-50 rounded-xl px-3 py-2">
                    <div className="text-[11px] text-slate-500">{k}</div>
                    <div className="text-sm font-medium">{v}</div>
                  </div>
                ))}
              </div>
              {detail.maintenance_note && (
                <div className="bg-amber-50 text-amber-800 rounded-xl px-3 py-2.5 text-sm flex gap-2">
                  <Wrench className="w-4 h-4 shrink-0 mt-0.5" />
                  {detail.maintenance_note}
                </div>
              )}
              <Button variant="secondary" size="lg" onClick={() => setDetail(null)}>閉じる</Button>
            </div>
          )}
        </Modal>
      </Page>
    </AppShell>
  )
}
