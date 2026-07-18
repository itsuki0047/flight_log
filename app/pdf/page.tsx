'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Flight, Aircraft, User } from '@/lib/types'
import AppShell from '@/components/AppShell'
import { Card, CardHeader, Button, Field, TextInput, Select, Page, PageTitle } from '@/components/ui'
import { listFlights, listAircraft, listUsers, derivePersonalLogEntries, deriveAircraftLogEntries } from '@/lib/db'
import { getLogbookSettings, hasInitials } from '@/lib/initials'
import { FileOutput, RefreshCw, Settings2, ExternalLink } from 'lucide-react'

export default function PdfPage() {
  const [logType, setLogType] = useState<'personal' | 'aircraft'>('personal')
  const [pdfFormat, setPdfFormat] = useState<'logbook' | 'simple'>('logbook')
  const [userId, setUserId] = useState('u2')
  const [aircraftId, setAircraftId] = useState('a1')
  const [flights, setFlights] = useState<Flight[]>([])
  const [aircraftList, setAircraftList] = useState<Aircraft[]>([])
  const [users, setUsers] = useState<User[]>([])
  useEffect(() => {
    listFlights().then(setFlights).catch(err => console.error(err))
    listAircraft().then(a => {
      setAircraftList(a)
      if (a.length && !a.some(x => x.id === 'a1')) setAircraftId(a[0].id)
    }).catch(() => {})
    listUsers().then(u => {
      setUsers(u)
      if (u.length && !u.some(x => x.id === 'u2')) setUserId(u[0].id)
    }).catch(() => {})
  }, [])
  const personalEntries = useMemo(() => derivePersonalLogEntries(flights), [flights])
  const aircraftLogEntries = useMemo(() => deriveAircraftLogEntries(flights, aircraftList), [flights, aircraftList])
  const [pageFrom, setPageFrom] = useState('')
  const [pageTo, setPageTo] = useState('')
  const [pageBounds, setPageBounds] = useState<[number, number] | null>(null)

  // 記録簿様式のページ範囲を自動計算して入力欄に反映する
  useEffect(() => {
    if (logType !== 'personal' || pdfFormat !== 'logbook') return
    let alive = true
    ;(async () => {
      const mod = await import('@/lib/pdf/logbook')
      const st = getLogbookSettings(userId)
      const entries = personalEntries
        .filter(e => e.user_id === userId)
        .sort((a, b) => a.date.localeCompare(b.date))
      const pages = mod.buildLogbookPages(entries, {
        initial: st.initials, startRow: st.startRow, startPage: st.startPage, cutoffDates: st.cutoffs,
      })
      if (!alive) return
      const first = pages[0]?.pageNo ?? st.startPage
      const last = pages[pages.length - 1]?.pageNo ?? st.startPage
      setPageBounds([first, last])
      setPageFrom(String(first))
      setPageTo(String(last))
    })()
    return () => { alive = false }
  }, [logType, pdfFormat, userId, personalEntries])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [building, setBuilding] = useState(false)
  const [count, setCount] = useState(0)
  const urlRef = useRef('')

  const user = users.find(u => u.id === userId)
  const aircraft = aircraftList.find(a => a.id === aircraftId)

  const buildBlob = useCallback(async () => {
    const mod = await import('@/lib/pdf/logbook')
    if (logType === 'personal') {
      if (pdfFormat === 'logbook') {
        // 記録簿様式: ページ割りが常に同じになるよう全記録+保存済み設定で計算し、
        // 出したいページは通算ページ番号の範囲で指定する
        const entries = personalEntries
          .filter(e => e.user_id === userId)
          .sort((a, b) => a.date.localeCompare(b.date))
        setCount(entries.length)
        const st = getLogbookSettings(userId)
        const range: [number, number] | undefined =
          pageFrom || pageTo
            ? [parseInt(pageFrom, 10) || st.startPage, parseInt(pageTo, 10) || 9999]
            : undefined
        const blob = await mod.buildPersonalLogbookPdf(entries, user?.name ?? '', {
          initial: st.initials,
          startRow: st.startRow,
          startPage: st.startPage,
          cutoffDates: st.cutoffs,
          pageRange: range,
        })
        return { blob, name: `個人飛行記録_${user?.name ?? ''}.pdf` }
      }
      const entries = personalEntries
        .filter(e => e.user_id === userId
          && (!from || e.date >= from) && (!to || e.date <= to))
        .sort((a, b) => a.date.localeCompare(b.date))
      setCount(entries.length)
      const blob = await mod.buildPersonalSimplePdf(entries, user?.name ?? '')
      return { blob, name: `個人飛行記録_${user?.name ?? ''}.pdf` }
    }
    const entries = aircraftLogEntries
      .filter(e => e.aircraft_id === aircraftId
        && (!from || e.date >= from) && (!to || e.date <= to))
      .sort((a, b) => a.date.localeCompare(b.date))
    setCount(entries.length)
    return { blob: await mod.buildAircraftLogPdf(entries, aircraft?.registration_number ?? '', aircraft?.aircraft_type ?? ''), name: `航空日誌_${aircraft?.registration_number ?? ''}.pdf` }
  }, [logType, pdfFormat, userId, aircraftId, from, to, pageFrom, pageTo, personalEntries, aircraftLogEntries, user?.name, aircraft?.registration_number, aircraft?.aircraft_type])

  const refreshPreview = useCallback(async () => {
    setBuilding(true)
    try {
      const { blob } = await buildBlob()
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      const url = URL.createObjectURL(blob)
      urlRef.current = url
      setPreviewUrl(url)
    } catch (err) {
      console.error(err)
      alert(`プレビュー生成に失敗しました: ${err instanceof Error ? err.message : err}`)
    } finally {
      setBuilding(false)
    }
  }, [buildBlob])

  useEffect(() => {
    refreshPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logType, pdfFormat, userId, aircraftId, from, to, pageFrom, pageTo, personalEntries, aircraftLogEntries])

  async function handleDownload() {
    setBuilding(true)
    try {
      const { blob, name } = await buildBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setBuilding(false)
    }
  }

  return (
    <AppShell>
      <Page className="max-w-7xl">
        <PageTitle>PDF出力</PageTitle>
        <div className="grid lg:grid-cols-4 gap-4 items-start">
          {/* 出力設定 */}
          <Card className="lg:sticky lg:top-20">
            <CardHeader icon={Settings2} title="出力設定" />
            <div className="p-4 space-y-3.5">
              <Field label="出力種類">
                <div className="grid grid-cols-2 gap-1.5">
                  {([['personal', '個人ログ'], ['aircraft', '航空日誌']] as const).map(([v, label]) => (
                    <button key={v}
                      onClick={() => setLogType(v)}
                      className={`text-sm py-2 rounded-xl border transition ${
                        logType === v ? 'bg-blue-600 border-blue-600 text-white font-medium' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
              {logType === 'personal' ? (
                <Field label="対象ユーザー">
                  <Select value={userId} onChange={e => setUserId(e.target.value)}>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </Select>
                </Field>
              ) : (
                <Field label="対象機体">
                  <Select value={aircraftId} onChange={e => setAircraftId(e.target.value)}>
                    {aircraftList.map(a => <option key={a.id} value={a.id}>{a.registration_number} ({a.aircraft_type})</option>)}
                  </Select>
                </Field>
              )}
              {logType === 'personal' && (
                <Field label="PDF形式">
                  <Select value={pdfFormat} onChange={e => setPdfFormat(e.target.value as 'logbook' | 'simple')}>
                    <option value="logbook">航空日誌様式（記録簿）</option>
                    <option value="simple">シンプル一覧</option>
                  </Select>
                </Field>
              )}
              {logType === 'personal' && pdfFormat === 'logbook' ? (
                <>
                  <div className="bg-slate-50 rounded-xl px-3 py-2.5 text-xs text-slate-600 space-y-0.5">
                    {(() => {
                      const st = getLogbookSettings(userId)
                      return (
                        <>
                          <div>開始: <b>第{st.startPage}頁 {st.startRow}行目</b>から</div>
                          <div>締め日: <b>{st.cutoffs.length > 0 ? st.cutoffs.join(' / ') : 'なし'}</b></div>
                          {hasInitials(st.initials) && <div className="text-blue-600">初期値を前頁までの合計に反映</div>}
                          <div className="text-slate-400">変更は個人ログ画面の「初期設定」から</div>
                        </>
                      )
                    })()}
                  </div>
                  <Field label={`出力ページ（から）${pageBounds ? ` — 全 第${pageBounds[0]}〜${pageBounds[1]}頁` : ''}`}>
                    <TextInput type="number" min={1} value={pageFrom} onChange={e => setPageFrom(e.target.value)}
                      className="text-right font-mono" />
                  </Field>
                  <Field label="出力ページ（まで）">
                    <TextInput type="number" min={1} value={pageTo} onChange={e => setPageTo(e.target.value)}
                      className="text-right font-mono" />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="出力期間（から）"><TextInput type="date" value={from} onChange={e => setFrom(e.target.value)} /></Field>
                  <Field label="出力期間（まで）"><TextInput type="date" value={to} onChange={e => setTo(e.target.value)} /></Field>
                </>
              )}

              <div className="bg-slate-50 rounded-xl px-3 py-2.5 text-xs text-slate-600 space-y-0.5">
                <div>出力件数: <b>{count}件</b></div>
                <div>用紙: A4 横（{logType === 'personal' ? (pdfFormat === 'simple' ? 'シンプル一覧' : '航空日誌様式') : '一覧形式'}）</div>
                <div>対象: <b>{logType === 'personal' ? user?.name : `${aircraft?.registration_number}`}</b></div>

              </div>

              <div className="space-y-2 pt-1">
                <Button size="lg" onClick={handleDownload} disabled={building || count === 0}>
                  <FileOutput className="w-4 h-4" />
                  {building ? '生成中…' : 'PDF出力'}
                </Button>
                <Button variant="secondary" size="lg" onClick={refreshPreview} disabled={building}>
                  <RefreshCw className="w-4 h-4" />プレビュー更新
                </Button>
              </div>
            </div>
          </Card>

          {/* プレビュー */}
          <Card className="lg:col-span-3 overflow-hidden">
            <CardHeader icon={FileOutput} title="プレビュー" action={
              building
                ? <span className="text-xs text-slate-400">生成中…</span>
                : previewUrl && (
                    <button
                      onClick={() => window.open(previewUrl, '_blank')}
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />新しいタブで開く
                    </button>
                  )
            } />
            {previewUrl ? (
              <iframe
                src={`${previewUrl}#toolbar=0&view=FitH`}
                title="PDFプレビュー"
                className="w-full bg-slate-200"
                style={{ height: 'min(75dvh, 720px)' }}
              />
            ) : (
              <div className="h-72 flex items-center justify-center text-sm text-slate-400">
                {building ? 'プレビューを生成しています…' : 'プレビューはありません'}
              </div>
            )}
            <p className="px-4 py-2.5 text-[11px] text-slate-400 border-t border-slate-100">
              ※ プレビューが空白の場合（スマートフォン等）は「新しいタブで開く」か、「PDF出力」で保存して確認してください。
            </p>
          </Card>
        </div>
      </Page>
    </AppShell>
  )
}
