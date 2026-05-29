'use client'
import { useState } from 'react'
import AppShell from '@/components/AppShell'
import LogbookSheet from '@/components/LogbookSheet'
import { mockPersonalLogEntries, mockUsers } from '@/lib/mock-data'
import { Printer } from 'lucide-react'

const ROWS_PER_PAGE = 11

export default function PdfPage() {
  const [logType, setLogType] = useState<'personal' | 'aircraft'>('personal')
  const [userId, setUserId] = useState('u2')

  const user = mockUsers.find(u => u.id === userId)
  const entries = mockPersonalLogEntries.filter(e => e.user_id === userId)

  // split into pages, computing running forward totals
  const pages: { rows: typeof entries; forwardTime: number; forwardCount: number }[] = []
  let runningTime = 0
  let runningCount = 0
  for (let i = 0; i < Math.max(1, entries.length); i += ROWS_PER_PAGE) {
    const slice = entries.slice(i, i + ROWS_PER_PAGE)
    pages.push({ rows: slice, forwardTime: runningTime, forwardCount: runningCount })
    runningTime += slice.reduce((s, e) => s + e.total_flight_time, 0)
    runningCount += slice.reduce((s, e) => s + e.landing_count, 0)
  }

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto print:p-0 print:max-w-none">
        <div className="flex items-center justify-between mb-6 print:hidden">
          <h1 className="text-2xl font-bold">PDF出力（ログブック）</h1>
          <button onClick={() => window.print()}
            className="flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-sky-700 transition">
            <Printer className="w-4 h-4" /> 印刷 / PDF保存
          </button>
        </div>

        {/* Controls */}
        <div className="bg-white border rounded-xl p-4 mb-6 flex gap-3 flex-wrap items-end print:hidden">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">ログ種別</label>
            <select value={logType} onChange={e => setLogType(e.target.value as 'personal' | 'aircraft')}
              className="border rounded-lg px-3 py-2 text-sm">
              <option value="personal">個人ログブック（滑空機）</option>
              <option value="aircraft">航空日誌</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">対象ユーザー</label>
            <select value={userId} onChange={e => setUserId(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm">
              {mockUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div className="text-sm text-gray-500 ml-auto">出力件数: {entries.length}件 / {pages.length}ページ</div>
        </div>

        {/* Preview / print area — latest page first per spec */}
        <div className="space-y-6 print:space-y-0">
          {[...pages].reverse().map((page, i) => (
            <div key={i} className="logbook-page bg-white border shadow-sm rounded-lg overflow-hidden print:border-0 print:shadow-none print:rounded-none">
              <div className="px-3 py-1.5 bg-gray-100 text-xs text-gray-500 print:hidden">
                ページ {pages.length - i} / {pages.length}
              </div>
              <div className="p-4 print:p-2">
                <LogbookSheet
                  entries={page.rows}
                  pilotName={user?.name ?? ''}
                  forwardTime={page.forwardTime}
                  forwardCount={page.forwardCount}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body { background: white; }
          aside, .print\\:hidden { display: none !important; }
          .logbook-page { page-break-after: always; }
          .logbook-page:last-child { page-break-after: auto; }
        }
      `}</style>
    </AppShell>
  )
}
