'use client'
import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import { Card, CardHeader, Chip, Button, Field, TextInput, Select, Modal, Page, PageTitle, Empty } from '@/components/ui'
import { listFlights, listAircraft, listUsers, derivePersonalLogEntries } from '@/lib/db'
import type { PersonalLogEntry, Aircraft, User, Flight } from '@/lib/types'
import { formatDate, formatMinutes, formatTime } from '@/lib/utils'
import {
  getLogbookSettings, saveLogbookSettings, emptySettings, emptyInitials, hasInitials, parseHm, toHm,
  INITIAL_ITEMS, type LogbookSettings,
} from '@/lib/initials'
import { FileOutput, BarChart3, ChevronRight, Settings2, X } from 'lucide-react'

const emptySearch = { from: '', to: '', aircraft: '', pic: '' }

export default function PersonalLogPage() {
  const [userId, setUserId] = useState('u2')
  const [flights, setFlights] = useState<Flight[]>([])
  const [aircraftList, setAircraftList] = useState<Aircraft[]>([])
  const [users, setUsers] = useState<User[]>([])
  useEffect(() => {
    listFlights().then(setFlights).catch(err => console.error(err))
    listAircraft().then(setAircraftList).catch(() => {})
    listUsers().then(u => {
      setUsers(u)
      if (u.length && !u.some(x => x.id === 'u2')) setUserId(u[0].id)
    }).catch(() => {})
  }, [])
  const allEntries = useMemo(() => derivePersonalLogEntries(flights), [flights])
  const [search, setSearch] = useState(emptySearch)
  const [detail, setDetail] = useState<PersonalLogEntry | null>(null)
  const [exporting, setExporting] = useState(false)
  const [settings, setSettings] = useState<LogbookSettings>(emptySettings())
  const [settingsOpen, setSettingsOpen] = useState(false)
  // 記録簿設定の編集フォーム（時間は "H:MM" 文字列で扱う）
  const [initForm, setInitForm] = useState<Record<string, { hm: string; cnt: string }>>({})
  const [initLandings, setInitLandings] = useState('')
  const [formStartPage, setFormStartPage] = useState('1')
  const [formStartRow, setFormStartRow] = useState('1')
  const [formCutoffs, setFormCutoffs] = useState<string[]>([])
  const [newCutoff, setNewCutoff] = useState('')

  useEffect(() => setSettings(getLogbookSettings(userId)), [userId])
  const initials = settings.initials

  const entries = useMemo(() => allEntries.filter(e => {
    if (e.user_id !== userId) return false
    if (search.from && e.date < search.from) return false
    if (search.to && e.date > search.to) return false
    if (search.aircraft && e.registration_number !== search.aircraft) return false
    if (search.pic === 'solo' && !(e.solo_time || e.pic_time)) return false
    if (search.pic === 'dual' && !e.dual_instruction_time) return false
    return true
  }).sort((a, b) => b.date.localeCompare(a.date)), [allEntries, userId, search])

  const totals = useMemo(() => ({
    time: entries.reduce((s, e) => s + e.total_flight_time, 0) + initials.ft.min,
    dual: entries.reduce((s, e) => s + (e.dual_instruction_time ?? 0), 0) + initials.dw.min + initials.da.min,
    solo: entries.reduce((s, e) => s + (e.solo_time ?? 0) + (e.pic_time ?? 0), 0) + initials.sw.min + initials.sa.min,
    landings: entries.reduce((s, e) => s + e.landing_count, 0) + initials.landings,
    xc: entries.reduce((s, e) => s + (e.cross_country_pic_solo_picus_time ?? 0), 0) + initials.xc.min,
    flights: entries.length + initials.ft.cnt,
  }), [entries, initials])

  function openSettings() {
    const form: Record<string, { hm: string; cnt: string }> = {}
    for (const item of INITIAL_ITEMS) {
      const v = initials[item.key]
      form[item.key] = { hm: toHm(v.min) || '0:00', cnt: String(v.cnt) }
    }
    setInitForm(form)
    setInitLandings(String(initials.landings))
    setFormStartPage(String(settings.startPage))
    setFormStartRow(String(settings.startRow))
    setFormCutoffs([...settings.cutoffs])
    setNewCutoff('')
    setSettingsOpen(true)
  }

  function handleSaveSettings() {
    const nextInitials = emptyInitials()
    for (const item of INITIAL_ITEMS) {
      nextInitials[item.key] = {
        min: parseHm(initForm[item.key]?.hm ?? ''),
        cnt: parseInt(initForm[item.key]?.cnt ?? '', 10) || 0,
      }
    }
    nextInitials.landings = parseInt(initLandings, 10) || 0
    const next: LogbookSettings = {
      initials: nextInitials,
      startPage: Math.max(1, parseInt(formStartPage, 10) || 1),
      startRow: Math.min(12, Math.max(1, parseInt(formStartRow, 10) || 1)),
      cutoffs: [...formCutoffs].sort(),
    }
    saveLogbookSettings(userId, next)
    setSettings(next)
    setSettingsOpen(false)
  }

  async function exportPdf() {
    setExporting(true)
    try {
      const { downloadPersonalLogbookPdf } = await import('@/lib/pdf/logbook')
      const pilot = users.find(u => u.id === userId)?.name ?? ''
      await downloadPersonalLogbookPdf([...entries].reverse(), pilot, {
        initial: settings.initials,
        startRow: settings.startRow,
        startPage: settings.startPage,
        cutoffDates: settings.cutoffs,
      })
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
          <div className="flex gap-2">
            <Button variant="secondary" onClick={openSettings}>
              <Settings2 className="w-4 h-4" />初期設定
            </Button>
            <Button onClick={exportPdf} disabled={exporting || entries.length === 0}>
              <FileOutput className="w-4 h-4" />
              {exporting ? '生成中…' : 'PDF出力'}
            </Button>
          </div>
        }>個人ログ</PageTitle>

        {/* 検索条件 */}
        <Card className="p-4 mb-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Field label="対象ユーザー" className="col-span-2 md:col-span-1">
              <Select value={userId} onChange={e => setUserId(e.target.value)}>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </Select>
            </Field>
            <Field label="期間（から）"><TextInput type="date" value={search.from} onChange={e => setSearch(p => ({ ...p, from: e.target.value }))} /></Field>
            <Field label="期間（まで）"><TextInput type="date" value={search.to} onChange={e => setSearch(p => ({ ...p, to: e.target.value }))} /></Field>
            <Field label="機体">
              <Select value={search.aircraft} onChange={e => setSearch(p => ({ ...p, aircraft: e.target.value }))}>
                <option value="">すべて</option>
                {aircraftList.map(a => <option key={a.id} value={a.registration_number}>{a.registration_number}</option>)}
              </Select>
            </Field>
            <Field label="PIC区分">
              <Select value={search.pic} onChange={e => setSearch(p => ({ ...p, pic: e.target.value }))}>
                <option value="">すべて</option>
                <option value="solo">単独/機長</option>
                <option value="dual">同乗教育</option>
              </Select>
            </Field>
          </div>
        </Card>

        {/* 累計（初期値込み） */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold">累計</span>
          {hasInitials(initials) && <Chip color="blue">アプリ導入前の初期値を含む</Chip>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4">
          {[
            ['総飛行時間', formatMinutes(totals.time)],
            ['フライト数', `${totals.flights}回`],
            ['単独/機長', formatMinutes(totals.solo)],
            ['同乗教育', formatMinutes(totals.dual)],
            ['野外飛行', formatMinutes(totals.xc)],
            ['着陸回数', `${totals.landings}回`],
          ].map(([k, v]) => (
            <Card key={k} className="p-3">
              <div className="text-[11px] text-slate-500">{k}</div>
              <div className="text-lg font-bold font-mono mt-0.5">{v}</div>
            </Card>
          ))}
        </div>

        {/* モバイル: カード */}
        <div className="md:hidden space-y-2.5">
          {entries.length === 0 && <Card><Empty>ログがありません</Empty></Card>}
          {entries.map(e => (
            <Card key={e.id} className="p-4">
              <button className="w-full text-left" onClick={() => setDetail(e)}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">{formatDate(e.date)}</span>
                  <div className="flex items-center gap-1.5">
                    <Chip color={e.dual_instruction_time ? 'orange' : 'blue'}>{e.dual_instruction_time ? '同乗' : '単独/機長'}</Chip>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
                <div className="text-sm font-bold">
                  {e.aircraft_type} <span className="font-normal text-slate-500">({e.registration_number})</span>
                  <span className="ml-2 font-mono">{formatMinutes(e.total_flight_time)}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {e.departure_place}→{e.arrival_place} ・ {e.launch_method_name ?? '—'}
                </div>
              </button>
            </Card>
          ))}
        </div>

        {/* デスクトップ: テーブル */}
        <Card className="hidden md:block overflow-hidden">
          <CardHeader icon={BarChart3} title={`飛行記録 ${entries.length}件`} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500">
                  <th className="px-3 py-2.5 text-left">日付</th>
                  <th className="px-3 py-2.5 text-left">機体</th>
                  <th className="px-3 py-2.5 text-left">区間</th>
                  <th className="px-3 py-2.5 text-left">時刻</th>
                  <th className="px-3 py-2.5 text-right">飛行時間</th>
                  <th className="px-3 py-2.5 text-right">単独/機長</th>
                  <th className="px-3 py-2.5 text-right">同乗教育</th>
                  <th className="px-3 py-2.5 text-right">着陸</th>
                  <th className="px-3 py-2.5 text-left">発航方法</th>
                  <th className="px-3 py-2.5 text-left">教官</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.length === 0 && (
                  <tr><td colSpan={11}><Empty>ログがありません</Empty></td></tr>
                )}
                {entries.map(e => (
                  <tr key={e.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setDetail(e)}>
                    <td className="px-3 py-3 whitespace-nowrap">{formatDate(e.date)}</td>
                    <td className="px-3 py-3 whitespace-nowrap font-medium">{e.aircraft_type} <span className="text-slate-400 font-normal">{e.registration_number}</span></td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">{e.departure_place}→{e.arrival_place}</td>
                    <td className="px-3 py-3 whitespace-nowrap font-mono text-xs">{formatTime(e.departure_time)}-{e.arrival_time ? formatTime(e.arrival_time) : ''}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatMinutes(e.total_flight_time)}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatMinutes((e.solo_time ?? 0) + (e.pic_time ?? 0))}</td>
                    <td className="px-3 py-3 text-right font-mono">{formatMinutes(e.dual_instruction_time)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{e.landing_count}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">{e.launch_method_name ?? '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{e.instructor_name ?? '—'}</td>
                    <td className="px-3 py-3"><ChevronRight className="w-4 h-4 text-slate-300" /></td>
                  </tr>
                ))}
              </tbody>
              {entries.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 font-semibold text-xs">
                    <td colSpan={4} className="px-3 py-2.5 text-right">合計（初期値込み）</td>
                    <td className="px-3 py-2.5 text-right font-mono">{formatMinutes(totals.time)}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{formatMinutes(totals.solo)}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{formatMinutes(totals.dual)}</td>
                    <td className="px-3 py-2.5 text-right">{totals.landings}</td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </Card>

        {/* 詳細モーダル */}
        <Modal open={!!detail} onClose={() => setDetail(null)} title="ログ詳細">
          {detail && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold">{detail.aircraft_type} ({detail.registration_number})</div>
                  <div className="text-xs text-slate-500">{formatDate(detail.date)}</div>
                </div>
                <Chip color={detail.dual_instruction_time ? 'orange' : 'blue'}>{detail.dual_instruction_time ? '同乗教育' : '単独/機長'}</Chip>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['区間', `${detail.departure_place} → ${detail.arrival_place}`],
                  ['時刻', `${formatTime(detail.departure_time)} - ${detail.arrival_time ? formatTime(detail.arrival_time) : ''}`],
                  ['飛行時間', formatMinutes(detail.total_flight_time)],
                  ['着陸回数', `${detail.landing_count}回`],
                  ['発航方法', detail.launch_method_name ?? '—'],
                  ['教官', detail.instructor_name ?? '—'],
                  ['野外飛行', formatMinutes(detail.cross_country_pic_solo_picus_time)],
                  ['教官時間', formatMinutes(detail.instruction_time)],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="bg-slate-50 rounded-xl px-3 py-2">
                    <div className="text-[11px] text-slate-500">{k}</div>
                    <div className="text-sm font-medium">{v}</div>
                  </div>
                ))}
              </div>
              {detail.supplementary_note && (
                <div className="bg-blue-50 text-blue-900 rounded-xl px-3 py-2.5 text-sm">{detail.supplementary_note}</div>
              )}
              <Button variant="secondary" size="lg" onClick={() => setDetail(null)}>閉じる</Button>
            </div>
          )}
        </Modal>

        {/* 記録簿設定モーダル */}
        <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="初期設定（紙の記録簿からの移行）" wide>
          <p className="text-xs text-slate-500 mb-4 leading-relaxed">
            この設定はユーザーごとに保存され、累計表示とPDF出力のページ割りに常に反映されます。
            例:「紙の45頁3行目からアプリを使い始め、提出のため47頁を途中で締めた」という状態を再現できます。
          </p>

          {/* 開始位置 */}
          <div className="mb-5">
            <div className="text-sm font-bold mb-2">① 開始位置（紙の続き）</div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="開始ページ番号（通算）">
                <TextInput type="number" min={1} value={formStartPage} onChange={e => setFormStartPage(e.target.value)}
                  className="text-right font-mono" />
              </Field>
              <Field label="開始行（1〜12）">
                <Select value={formStartRow} onChange={e => setFormStartRow(e.target.value)}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>{n}行目から</option>
                  ))}
                </Select>
              </Field>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              アプリ最初の記録が「第{formStartPage || '1'}頁の{formStartRow}行目」に載ります。手前の行は空欄で出力されます。
            </p>
          </div>

          {/* 初期値 */}
          <div className="mb-5">
            <div className="text-sm font-bold mb-2">② 初期値（アプリ導入前の総合計）</div>
            <p className="text-[11px] text-slate-400 mb-2">
              紙の記録簿の最終「総合計」欄の値を入力してください。開始ページの「前頁までの合計」になります。時間は「12:30」形式です。
            </p>
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_88px_72px] gap-2 text-[11px] text-slate-400 px-1">
                <span>項目</span><span>時間 (H:MM)</span><span>回数</span>
              </div>
              {INITIAL_ITEMS.map(item => (
                <div key={item.key} className="grid grid-cols-[1fr_88px_72px] gap-2 items-center">
                  <span className="text-sm">{item.label}</span>
                  <TextInput
                    value={initForm[item.key]?.hm ?? ''}
                    onChange={e => setInitForm(p => ({ ...p, [item.key]: { ...p[item.key], hm: e.target.value } }))}
                    placeholder="0:00"
                    className="text-right font-mono"
                  />
                  <TextInput
                    value={initForm[item.key]?.cnt ?? ''}
                    onChange={e => setInitForm(p => ({ ...p, [item.key]: { ...p[item.key], cnt: e.target.value } }))}
                    placeholder="0"
                    className="text-right font-mono"
                  />
                </div>
              ))}
              <div className="grid grid-cols-[1fr_88px_72px] gap-2 items-center">
                <span className="text-sm">着陸回数 合計</span>
                <span />
                <TextInput value={initLandings} onChange={e => setInitLandings(e.target.value)}
                  placeholder="0" className="text-right font-mono" />
              </div>
            </div>
          </div>

          {/* 締め日履歴 */}
          <div className="mb-2">
            <div className="text-sm font-bold mb-2">③ 締め日の履歴（提出などでページを途中で閉じた日）</div>
            <p className="text-[11px] text-slate-400 mb-2">
              締め日を登録すると、その日の記録でページが閉じ、次の記録は新しいページから始まります。
              履歴として保存されるので、過去のどのページを出力してもページ割りが変わりません。
            </p>
            <div className="flex gap-2 mb-2">
              <TextInput type="date" value={newCutoff} onChange={e => setNewCutoff(e.target.value)} />
              <Button variant="secondary" size="sm" className="shrink-0"
                onClick={() => {
                  if (newCutoff && !formCutoffs.includes(newCutoff)) setFormCutoffs(p => [...p, newCutoff].sort())
                  setNewCutoff('')
                }}>
                締め日を追加
              </Button>
            </div>
            {formCutoffs.length === 0 ? (
              <p className="text-xs text-slate-400">締め日はまだ登録されていません</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {formCutoffs.map(d => (
                  <span key={d} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full">
                    {d} で締め
                    <button onClick={() => setFormCutoffs(p => p.filter(x => x !== d))} aria-label={`${d}を削除`}
                      className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-5">
            <Button variant="secondary" className="flex-1" onClick={() => setSettingsOpen(false)}>キャンセル</Button>
            <Button className="flex-1" onClick={handleSaveSettings}>保存する</Button>
          </div>
        </Modal>
      </Page>
    </AppShell>
  )
}
