'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import { Card, CardHeader, Chip, statusChipColor, Page, Empty } from '@/components/ui'
import { listFlights, listAircraft, derivePersonalLogEntries, deriveAircraftLogEntries } from '@/lib/db'
import { fetchNotices, type Notice } from '@/lib/notices'
import { getSessionUserAsync } from '@/lib/session'
import { formatMinutes, formatTime, formatDateShort, flightStatusLabel } from '@/lib/utils'
import {
  PlaneTakeoff, Plane, Clock, BookOpen, ChevronRight, Megaphone,
} from 'lucide-react'
import type { User, Flight, Aircraft } from '@/lib/types'

const roleLabel: Record<string, string> = { admin: 'admin', manager: '運航管理者', instructor: '教官', operator: 'ピスト', member: '学生' }


export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [notices, setNotices] = useState<Notice[]>([])
  const [flights, setFlights] = useState<Flight[]>([])
  const [aircraft, setAircraft] = useState<Aircraft[]>([])
  useEffect(() => {
    getSessionUserAsync().then(setUser)
    fetchNotices().then(setNotices).catch(() => {})
    Promise.all([listFlights(), listAircraft()])
      .then(([f, a]) => { setFlights(f); setAircraft(a) })
      .catch(err => console.error(err))
  }, [])
  const personalEntries = useMemo(() => derivePersonalLogEntries(flights), [flights])
  const aircraftLogEntries = useMemo(() => deriveAircraftLogEntries(flights, aircraft), [flights, aircraft])

  const today = new Date().toISOString().split('T')[0]
  const todayFlights = flights.filter(f => f.departure_time.startsWith(today))
  const inFlight = flights.filter(f => f.flight_status === 'launched')
  const activeAircraft = aircraft.filter(a => a.aircraft_status === 'active' && a.is_visible)
  const recentLogs = [...personalEntries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4)
  const recentAircraftLogs = [...aircraftLogEntries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4)

  const hour = new Date().getHours()
  const greeting = hour < 11 ? 'おはようございます' : hour < 18 ? 'こんにちは' : 'こんばんは'

  return (
    <AppShell>
      <Page>
        {/* 挨拶 */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
            {user?.name.charAt(0) ?? '　'}
          </div>
          <div>
            <div className="font-bold">
              {user?.name ?? ''} さん
              {user && <Chip color="blue" className="ml-2">{roleLabel[user.role]}</Chip>}
            </div>
            <div className="text-xs text-slate-500">{greeting}！今日も安全飛行で行きましょう。</div>
          </div>
        </div>

        {/* 本日のサマリ */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <Card className="p-3.5 text-center">
            <div className="text-[11px] text-slate-500 mb-1">今日のフライト</div>
            <div className="text-2xl font-bold text-blue-600 tabular-nums">{todayFlights.length}<span className="text-xs font-normal text-slate-400 ml-0.5">件</span></div>
          </Card>
          <Card className="p-3.5 text-center">
            <div className="text-[11px] text-slate-500 mb-1">飛行中</div>
            <div className="text-2xl font-bold text-emerald-600 tabular-nums">{inFlight.length}<span className="text-xs font-normal text-slate-400 ml-0.5">機</span></div>
          </Card>
          <Card className="p-3.5 text-center">
            <div className="text-[11px] text-slate-500 mb-1">使用可能機体</div>
            <div className="text-2xl font-bold text-violet-600 tabular-nums">{activeAircraft.length}<span className="text-xs font-normal text-slate-400 ml-0.5">機</span></div>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* 本日のフライト */}
          <Card>
            <CardHeader icon={Clock} title="本日のフライト" action={
              <Link href="/logs" className="text-xs text-blue-600 flex items-center hover:underline">すべて見る<ChevronRight className="w-3.5 h-3.5" /></Link>
            } />
            <div className="divide-y divide-slate-100">
              {todayFlights.length === 0 && <Empty>本日のフライトはありません</Empty>}
              {todayFlights.map(f => (
                <div key={f.id} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${f.flight_status === 'launched' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                    <PlaneTakeoff className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {formatTime(f.departure_time)} - {f.arrival_time ? formatTime(f.arrival_time) : '飛行中'}
                      <span className="ml-2 text-slate-500 font-normal">{f.aircraft?.aircraft_type} ({f.aircraft?.registration_number})</span>
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {f.pilot?.name}{f.instructor ? ` / 教官: ${f.instructor.name}` : ''} ・ {f.subject?.name}
                    </div>
                  </div>
                  <Chip color={statusChipColor(f.flight_status)}>{flightStatusLabel(f.flight_status)}</Chip>
                </div>
              ))}
            </div>
          </Card>

          {/* 使用中機体 */}
          <Card>
            <CardHeader icon={Plane} title="機体の状態" action={
              <Link href="/aircraft" className="text-xs text-blue-600 flex items-center hover:underline">機体管理<ChevronRight className="w-3.5 h-3.5" /></Link>
            } />
            <div className="divide-y divide-slate-100">
              {aircraft.filter(a => a.is_visible).map(a => {
                const flying = inFlight.some(f => f.aircraft_id === a.id)
                return (
                  <div key={a.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{a.registration_number} <span className="text-slate-500 font-normal">{a.aircraft_type}</span></div>
                    </div>
                    {flying
                      ? <Chip color="blue">飛行中</Chip>
                      : <Chip color={statusChipColor(a.aircraft_status)}>
                          {a.aircraft_status === 'active' ? '待機中' : a.aircraft_status === 'maintenance' ? '整備中' : '停止'}
                        </Chip>}
                  </div>
                )
              })}
            </div>
          </Card>

          {/* お知らせ */}
          <Card>
            <CardHeader icon={Megaphone} title="お知らせ" />
            <div className="divide-y divide-slate-100">
              {notices.length === 0 && <Empty>お知らせはありません</Empty>}
              {notices.map(n => (
                <div key={n.id} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Chip color={n.kind === 'maintenance' ? 'yellow' : 'blue'}>
                      {n.kind === 'maintenance' ? 'メンテナンス' : 'お知らせ'}
                    </Chip>
                    <span className="text-[11px] text-slate-400">{n.date}</span>
                  </div>
                  <div className="text-sm font-medium">{n.title}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{n.body}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* 最近のフライト記録 */}
          <Card>
            <CardHeader icon={BookOpen} title="最近のフライト記録" action={
              <Link href="/personal-log" className="text-xs text-blue-600 flex items-center hover:underline">個人ログへ<ChevronRight className="w-3.5 h-3.5" /></Link>
            } />
            <div className="divide-y divide-slate-100">
              {recentLogs.length === 0 && <Empty>記録がありません</Empty>}
              {recentLogs.map(log => (
                <div key={log.id} className="px-4 py-3 flex items-center gap-3">
                  <Chip color="gray" className="shrink-0">{formatDateShort(log.date)}</Chip>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {formatTime(log.departure_time)} - {log.arrival_time ? formatTime(log.arrival_time) : '--:--'}
                      <span className="ml-2 text-slate-500 font-normal">{log.aircraft_type} ({log.registration_number})</span>
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {log.departure_place} → {log.arrival_place}{log.instructor_name ? ` ・ 教官: ${log.instructor_name}` : ''}
                    </div>
                  </div>
                  <span className="font-mono text-sm text-slate-700">{formatMinutes(log.total_flight_time)}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* 最近の航空日誌 */}
          <Card>
            <CardHeader icon={BookOpen} title="最近の航空日誌" action={
              <Link href="/aircraft-log" className="text-xs text-blue-600 flex items-center hover:underline">航空日誌へ<ChevronRight className="w-3.5 h-3.5" /></Link>
            } />
            <div className="divide-y divide-slate-100">
              {recentAircraftLogs.length === 0 && <Empty>記録がありません</Empty>}
              {recentAircraftLogs.map(log => (
                <div key={log.id} className="px-4 py-3 flex items-center gap-3">
                  <Chip color="gray" className="shrink-0">{formatDateShort(log.date)}</Chip>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">
                      {log.registration_number}
                      <span className="ml-2 text-slate-500 font-normal">{log.pilot_name}</span>
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      機体時間 {formatMinutes(log.initial_airframe_time)} → {formatMinutes(log.final_airframe_time)}
                    </div>
                  </div>
                  <span className="font-mono text-sm text-slate-700">{formatMinutes(log.flight_time)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </Page>
    </AppShell>
  )
}
