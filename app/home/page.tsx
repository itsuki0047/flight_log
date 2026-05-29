import AppShell from '@/components/AppShell'
import { mockFlights, mockAircraft, mockPersonalLogEntries } from '@/lib/mock-data'
import { formatMinutes, formatTime, formatDateShort, flightStatusColor, flightStatusLabel } from '@/lib/utils'
import { PlaneTakeoff, Plane, Clock, BookOpen } from 'lucide-react'

export default function HomePage() {
  const today = new Date().toISOString().split('T')[0]
  const todayFlights = mockFlights.filter(f => f.departure_time.startsWith(today))
  const inFlight = mockFlights.filter(f => f.flight_status === 'launched')
  const recentLogs = mockPersonalLogEntries.slice(0, 5)

  const totalToday = todayFlights.reduce((s, f) => s + (f.flight_time ?? 0), 0)

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">ホーム</h1>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border p-4">
            <div className="text-xs text-gray-500 mb-1">今日のフライト</div>
            <div className="text-3xl font-bold text-sky-600">{todayFlights.length}<span className="text-base font-normal text-gray-500 ml-1">件</span></div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="text-xs text-gray-500 mb-1">飛行中</div>
            <div className="text-3xl font-bold text-blue-600">{inFlight.length}<span className="text-base font-normal text-gray-500 ml-1">機</span></div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="text-xs text-gray-500 mb-1">今日の飛行時間</div>
            <div className="text-3xl font-bold text-emerald-600">{formatMinutes(totalToday)}</div>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="text-xs text-gray-500 mb-1">稼働機体</div>
            <div className="text-3xl font-bold text-violet-600">
              {mockAircraft.filter(a => a.aircraft_status === 'active').length}
              <span className="text-base font-normal text-gray-500 ml-1">機</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* In flight */}
          <div className="bg-white rounded-xl border">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <PlaneTakeoff className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-sm">現在飛行中</span>
            </div>
            <div className="divide-y">
              {inFlight.length === 0 && (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">現在飛行中の機体はありません</p>
              )}
              {inFlight.map(f => (
                <div key={f.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{f.aircraft?.registration_number} {f.aircraft?.aircraft_type}</div>
                    <div className="text-xs text-gray-500">{f.pilot?.name} / {f.subject?.name}</div>
                  </div>
                  <div className="text-xs text-blue-600 font-medium">
                    {formatTime(f.departure_time)} 発航
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today's flights */}
          <div className="bg-white rounded-xl border">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="font-semibold text-sm">今日のフライト</span>
            </div>
            <div className="divide-y">
              {todayFlights.length === 0 && (
                <p className="px-4 py-6 text-sm text-gray-400 text-center">本日のフライトはありません</p>
              )}
              {todayFlights.map(f => (
                <div key={f.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{f.aircraft?.registration_number} — {f.pilot?.name}</div>
                    <div className="text-xs text-gray-500">
                      {formatTime(f.departure_time)} → {f.arrival_time ? formatTime(f.arrival_time) : '---'}
                      {f.flight_time ? ` (${formatMinutes(f.flight_time)})` : ''}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${flightStatusColor(f.flight_status)}`}>
                    {flightStatusLabel(f.flight_status)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Aircraft status */}
          <div className="bg-white rounded-xl border">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <Plane className="w-4 h-4 text-gray-600" />
              <span className="font-semibold text-sm">機体状態</span>
            </div>
            <div className="divide-y">
              {mockAircraft.map(a => (
                <div key={a.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{a.registration_number}</div>
                    <div className="text-xs text-gray-500">{a.aircraft_type}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    a.aircraft_status === 'active' ? 'bg-green-100 text-green-700' :
                    a.aircraft_status === 'maintenance' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {a.aircraft_status === 'active' ? '使用中' : a.aircraft_status === 'maintenance' ? '整備中' : '停止'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent personal logs */}
          <div className="bg-white rounded-xl border">
            <div className="px-4 py-3 border-b flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-gray-600" />
              <span className="font-semibold text-sm">最近の個人ログ</span>
            </div>
            <div className="divide-y">
              {recentLogs.map(log => (
                <div key={log.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{formatDateShort(log.date)} {log.aircraft_type} {log.registration_number}</div>
                    <div className="text-xs text-gray-500">{log.departure_place} → {log.arrival_place}</div>
                  </div>
                  <div className="text-sm font-mono text-gray-700">{formatMinutes(log.total_flight_time)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
