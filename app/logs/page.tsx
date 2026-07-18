'use client'
import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import {
  Card, Chip, statusChipColor, Button, Field, TextInput, Select, Modal, Page, PageTitle, Empty, inputCls,
} from '@/components/ui'
import { listFlights, listAircraft, listUsers, listSubjects, listLaunchMethods, updateFlight, deleteFlight } from '@/lib/db'
import type { Flight, Aircraft, User, FlightSubject, LaunchMethod } from '@/lib/types'
import { formatDate, formatTime, formatMinutes, flightStatusLabel, aircraftStatusLabel } from '@/lib/utils'
import { getSessionUserAsync } from '@/lib/session'
import { SlidersHorizontal, Download, Pencil, History, Trash2 } from 'lucide-react'

interface EditHistory {
  flightId: string
  at: string
  by: string
  summary: string
}

const emptySearch = {
  from: '', to: '', aircraft: '', pilot: '', instructor: '',
  subject: '', launch: '', status: '', pic: '', incomplete: '',
}

const PAGE_SIZE = 50

export default function LogsPage() {
  const [flights, setFlights] = useState<Flight[]>([])
  const [aircraftList, setAircraftList] = useState<Aircraft[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [subjects, setSubjects] = useState<FlightSubject[]>([])
  const [launchMethods, setLaunchMethods] = useState<LaunchMethod[]>([])
  const [canDelete, setCanDelete] = useState(false)
  const reload = () => listFlights().then(setFlights).catch(err => console.error(err))
  useEffect(() => {
    getSessionUserAsync().then(u => setCanDelete(u?.role === 'admin' || u?.role === 'instructor'))
    reload()
    listAircraft().then(setAircraftList).catch(() => {})
    listUsers().then(setUsers).catch(() => {})
    listSubjects().then(setSubjects).catch(() => {})
    listLaunchMethods().then(setLaunchMethods).catch(() => {})
  }, [])
  const [search, setSearch] = useState(emptySearch)
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Flight | null>(null)
  const [editForm, setEditForm] = useState<Partial<Flight>>({})
  const [history, setHistory] = useState<EditHistory[]>([
    { flightId: 'f4', at: '2026-05-28T10:30:00Z', by: '佐藤 次郎', summary: '飛行時間を修正 (30分 → 35分)' },
    { flightId: 'f6', at: '2026-06-21T12:00:00Z', by: '田中 一郎', summary: '最高高度を追記' },
  ])

  const filtered = useMemo(() => flights.filter(f => {
    const date = f.departure_time.split('T')[0]
    if (search.from && date < search.from) return false
    if (search.to && date > search.to) return false
    if (search.aircraft && f.aircraft_id !== search.aircraft) return false
    if (search.pilot && f.pilot_id !== search.pilot) return false
    if (search.instructor && f.instructor_id !== search.instructor) return false
    if (search.subject && f.subject_id !== search.subject) return false
    if (search.launch && f.launch_method_id !== search.launch) return false
    if (search.status && f.flight_status !== search.status) return false
    if (search.pic && f.pic_type !== search.pic) return false
    if (search.incomplete === 'yes' && f.arrival_time) return false
    return true
  }).sort((a, b) => b.departure_time.localeCompare(a.departure_time)), [flights, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const activeFilterCount = Object.values(search).filter(Boolean).length

  function openEdit(f: Flight) {
    setEditing(f)
    setEditForm({
      departure_place: f.departure_place,
      arrival_place: f.arrival_place,
      flight_time: f.flight_time,
      landing_count: f.landing_count,
      release_altitude: f.release_altitude,
      max_altitude: f.max_altitude,
      flight_content: f.flight_content,
      supplementary_note: f.supplementary_note,
      flights_memo: f.flights_memo,
    })
  }

  async function handleDelete() {
    if (!editing) return
    const label = `${formatDate(editing.departure_time)} ${editing.aircraft?.registration_number ?? ''} ${editing.pilot?.name ?? ''}`
    if (!confirm(`このフライトを削除しますか？\n${label}\n\nこの操作は取り消せません。`)) return
    try {
      await deleteFlight(editing.id)
      await reload()
      setEditing(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : '削除に失敗しました')
    }
  }

  async function handleSaveEdit() {
    if (!editing) return
    const now = new Date().toISOString()
    try {
      await updateFlight(editing.id, { ...editForm, is_edited: true })
      await reload()
      setHistory(prev => [{ flightId: editing.id, at: now, by: '（自分）', summary: 'フライト情報を編集' }, ...prev])
      setEditing(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存に失敗しました')
    }
  }

  function exportCsv() {
    const header = ['日付', '機体', '搭乗者', '教官', '科目', '発航', '着陸', '飛行時間(分)', '発航方法', 'PIC区分', '離脱高度', '最高高度', '状態', '飛行内容']
    const rows = filtered.map(f => [
      formatDate(f.departure_time), f.aircraft?.registration_number ?? '', f.pilot?.name ?? '',
      f.instructor?.name ?? '', f.subject?.name ?? '', formatTime(f.departure_time),
      f.arrival_time ? formatTime(f.arrival_time) : '', f.flight_time ?? '',
      f.launch_method?.name ?? '', f.pic_type, f.release_altitude ?? '', f.max_altitude ?? '',
      flightStatusLabel(f.flight_status), f.flight_content ?? '',
    ])
    const csv = '﻿' + [header, ...rows].map(r => r.map(c => `"${String(c).replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `全体ログ_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const editingHistory = editing ? history.filter(h => h.flightId === editing.id) : []

  return (
    <AppShell>
      <Page className="max-w-7xl">
        <PageTitle action={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={exportCsv}><Download className="w-4 h-4" />CSV出力</Button>
          </div>
        }>全体ログ確認</PageTitle>

        {/* 検索条件 */}
        <Card className="mb-4">
          <button
            onClick={() => setFilterOpen(o => !o)}
            className="w-full px-4 py-3 flex items-center gap-2 text-sm font-semibold"
          >
            <SlidersHorizontal className="w-4 h-4 text-blue-600" />
            検索条件
            {activeFilterCount > 0 && <Chip color="blue">{activeFilterCount}件適用中</Chip>}
            <span className="ml-auto text-xs text-slate-400">{filterOpen ? '閉じる' : '開く'}</span>
          </button>
          {filterOpen && (
            <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-slate-100 pt-4">
              <Field label="日付（から）"><TextInput type="date" value={search.from} onChange={e => { setPage(1); setSearch(p => ({ ...p, from: e.target.value })) }} /></Field>
              <Field label="日付（まで）"><TextInput type="date" value={search.to} onChange={e => setSearch(p => ({ ...p, to: e.target.value }))} /></Field>
              <Field label="機体">
                <Select value={search.aircraft} onChange={e => setSearch(p => ({ ...p, aircraft: e.target.value }))}>
                  <option value="">すべて</option>
                  {aircraftList.map(a => <option key={a.id} value={a.id}>{a.registration_number}</option>)}
                </Select>
              </Field>
              <Field label="搭乗者">
                <Select value={search.pilot} onChange={e => setSearch(p => ({ ...p, pilot: e.target.value }))}>
                  <option value="">すべて</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Select>
              </Field>
              <Field label="教官">
                <Select value={search.instructor} onChange={e => setSearch(p => ({ ...p, instructor: e.target.value }))}>
                  <option value="">すべて</option>
                  {users.filter(u => u.role === 'instructor' || u.role === 'admin').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </Select>
              </Field>
              <Field label="科目">
                <Select value={search.subject} onChange={e => setSearch(p => ({ ...p, subject: e.target.value }))}>
                  <option value="">すべて</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
              <Field label="発航方法">
                <Select value={search.launch} onChange={e => setSearch(p => ({ ...p, launch: e.target.value }))}>
                  <option value="">すべて</option>
                  {launchMethods.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </Select>
              </Field>
              <Field label="フライト状態">
                <Select value={search.status} onChange={e => setSearch(p => ({ ...p, status: e.target.value }))}>
                  <option value="">すべて</option>
                  <option value="launched">飛行中</option>
                  <option value="landed">着陸済</option>
                  <option value="pending_approval">承認待ち</option>
                  <option value="approved">承認済</option>
                </Select>
              </Field>
              <Field label="PIC区分">
                <Select value={search.pic} onChange={e => setSearch(p => ({ ...p, pic: e.target.value }))}>
                  <option value="">すべて</option>
                  <option value="PIC">PIC</option>
                  <option value="Dual">Dual</option>
                  <option value="Solo">Solo</option>
                </Select>
              </Field>
              <Field label="未入力（着陸未記録）">
                <Select value={search.incomplete} onChange={e => setSearch(p => ({ ...p, incomplete: e.target.value }))}>
                  <option value="">すべて</option>
                  <option value="yes">未入力のみ</option>
                </Select>
              </Field>
              <div className="flex items-end">
                <Button variant="secondary" size="sm" onClick={() => setSearch(emptySearch)}>条件をクリア</Button>
              </div>
            </div>
          )}
        </Card>

        <div className="text-sm text-slate-500 mb-2">
          {filtered.length}件{totalPages > 1 && ` （${currentPage} / ${totalPages}ページ・50件ずつ表示）`}
        </div>

        {/* モバイル: カード */}
        <div className="md:hidden space-y-2.5">
          {paged.length === 0 && <Card><Empty>該当するフライトがありません</Empty></Card>}
          {paged.map(f => (
            <Card key={f.id} className="p-4">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-slate-400">{formatDate(f.departure_time)}</div>
                <div className="flex items-center gap-1.5">
                  {f.is_edited && <Chip color="orange">編集済</Chip>}
                  <Chip color={statusChipColor(f.flight_status)}>{flightStatusLabel(f.flight_status)}</Chip>
                </div>
              </div>
              <div className="font-bold text-sm">
                {f.aircraft?.registration_number}
                <span className="ml-2 font-normal text-slate-600">{f.pilot?.name}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-2">
                <span className="font-mono">{formatTime(f.departure_time)}-{f.arrival_time ? formatTime(f.arrival_time) : '--:--'}</span>
                {f.flight_time != null && <span className="font-mono">{formatMinutes(f.flight_time)}</span>}
                <span>{f.subject?.name}</span>
                <span>{f.launch_method?.name}</span>
              </div>
              <div className="mt-2 flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => openEdit(f)}><Pencil className="w-3.5 h-3.5" />編集</Button>
              </div>
            </Card>
          ))}
        </div>

        {/* デスクトップ: テーブル */}
        <Card className="hidden md:block overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500">
                  <th className="px-3 py-2.5 text-left">日付</th>
                  <th className="px-3 py-2.5 text-left">機体</th>
                  <th className="px-3 py-2.5 text-left">搭乗者</th>
                  <th className="px-3 py-2.5 text-left">教官</th>
                  <th className="px-3 py-2.5 text-left">科目</th>
                  <th className="px-3 py-2.5 text-left">発航</th>
                  <th className="px-3 py-2.5 text-left">着陸</th>
                  <th className="px-3 py-2.5 text-right">飛行時間</th>
                  <th className="px-3 py-2.5 text-left">発航方法</th>
                  <th className="px-3 py-2.5 text-right">離脱高</th>
                  <th className="px-3 py-2.5 text-right">最高高</th>
                  <th className="px-3 py-2.5 text-left">状態</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paged.length === 0 && (
                  <tr><td colSpan={13}><Empty>該当するフライトがありません</Empty></td></tr>
                )}
                {paged.map(f => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 whitespace-nowrap">{formatDate(f.departure_time)}</td>
                    <td className="px-3 py-3 font-medium whitespace-nowrap">
                      {f.aircraft?.registration_number}
                      {f.is_edited && <Chip color="orange" className="ml-1.5">編</Chip>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">{f.pilot?.name}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">{f.instructor?.name ?? '—'}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{f.subject?.name}</td>
                    <td className="px-3 py-3 font-mono">{formatTime(f.departure_time)}</td>
                    <td className="px-3 py-3 font-mono">{f.arrival_time ? formatTime(f.arrival_time) : '---'}</td>
                    <td className="px-3 py-3 text-right font-mono">{f.flight_time != null ? formatMinutes(f.flight_time) : '---'}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">{f.launch_method?.name}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{f.release_altitude ? `${f.release_altitude}m` : '—'}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{f.max_altitude ? `${f.max_altitude}m` : '—'}</td>
                    <td className="px-3 py-3"><Chip color={statusChipColor(f.flight_status)}>{flightStatusLabel(f.flight_status)}</Chip></td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <button onClick={() => openEdit(f)} className="text-slate-400 hover:text-blue-600 p-1" title="編集">
                        <Pencil className="w-4 h-4" />
                      </button>
                      {canDelete && (
                        <button
                          onClick={async () => {
                            if (!confirm(`このフライトを削除しますか？\n${formatDate(f.departure_time)} ${f.aircraft?.registration_number ?? ''} ${f.pilot?.name ?? ''}\n\nこの操作は取り消せません。`)) return
                            try {
                              await deleteFlight(f.id)
                              await reload()
                            } catch (err) {
                              alert(err instanceof Error ? err.message : '削除に失敗しました')
                            }
                          }}
                          className="text-slate-400 hover:text-red-500 p-1" title="削除"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ページャ */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button variant="secondary" size="sm" disabled={currentPage <= 1} onClick={() => setPage(p => p - 1)}>前の50件</Button>
            <span className="text-sm text-slate-500 tabular-nums">{currentPage} / {totalPages}</span>
            <Button variant="secondary" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(p => p + 1)}>次の50件</Button>
          </div>
        )}

        {/* フライト編集モーダル */}
        <Modal open={!!editing} onClose={() => setEditing(null)} title="フライト編集" wide>
          {editing && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-bold">{editing.aircraft?.registration_number}</span>
                <span>{formatDate(editing.departure_time)}</span>
                <span>{editing.pilot?.name}{editing.instructor ? ` / 教官: ${editing.instructor.name}` : ''}</span>
                <span>{editing.subject?.name}</span>
                <Chip color={statusChipColor(editing.flight_status)}>{flightStatusLabel(editing.flight_status)}</Chip>
                {editing.aircraft && (
                  <Chip color={statusChipColor(editing.aircraft.aircraft_status)}>
                    機体: {aircraftStatusLabel(editing.aircraft.aircraft_status)}
                  </Chip>
                )}
                {editing.is_edited && <Chip color="orange">編集済</Chip>}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Field label="出発地"><TextInput value={editForm.departure_place ?? ''} onChange={e => setEditForm(p => ({ ...p, departure_place: e.target.value }))} /></Field>
                <Field label="到着地"><TextInput value={editForm.arrival_place ?? ''} onChange={e => setEditForm(p => ({ ...p, arrival_place: e.target.value }))} /></Field>
                <Field label="飛行時間(分)"><TextInput type="number" value={editForm.flight_time ?? ''} onChange={e => setEditForm(p => ({ ...p, flight_time: e.target.value ? Number(e.target.value) : undefined }))} /></Field>
                <Field label="着陸回数"><TextInput type="number" value={editForm.landing_count ?? 0} onChange={e => setEditForm(p => ({ ...p, landing_count: Number(e.target.value) }))} /></Field>
                <Field label="離脱高度(m)"><TextInput type="number" value={editForm.release_altitude ?? ''} onChange={e => setEditForm(p => ({ ...p, release_altitude: e.target.value ? Number(e.target.value) : undefined }))} /></Field>
                <Field label="最高高度(m)"><TextInput type="number" value={editForm.max_altitude ?? ''} onChange={e => setEditForm(p => ({ ...p, max_altitude: e.target.value ? Number(e.target.value) : undefined }))} /></Field>
                <Field label="飛行内容" className="col-span-2 md:col-span-3">
                  <TextInput value={editForm.flight_content ?? ''} onChange={e => setEditForm(p => ({ ...p, flight_content: e.target.value }))} />
                </Field>
                <Field label="補足事項" className="col-span-2 md:col-span-3">
                  <textarea value={editForm.supplementary_note ?? ''} onChange={e => setEditForm(p => ({ ...p, supplementary_note: e.target.value }))} rows={2} className={inputCls} />
                </Field>
              </div>

              {/* 編集履歴 */}
              <div>
                <div className="flex items-center gap-1.5 text-sm font-semibold mb-2">
                  <History className="w-4 h-4 text-slate-400" />編集履歴
                </div>
                {editingHistory.length === 0 ? (
                  <p className="text-xs text-slate-400">編集履歴はありません</p>
                ) : (
                  <div className="space-y-1.5">
                    {editingHistory.map((h, i) => (
                      <div key={i} className="text-xs bg-slate-50 rounded-lg px-3 py-2 flex flex-wrap gap-x-2">
                        <span className="text-slate-400">{h.at.replace('T', ' ').slice(0, 16)}</span>
                        <span className="font-medium">{h.by}</span>
                        <span className="text-slate-600">{h.summary}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-400">保存すると「編集済み」マークが付き、履歴に記録されます。</p>
              <div className="flex gap-2">
                {canDelete && (
                  <Button variant="danger" onClick={handleDelete} title="このフライトを削除">
                    <Trash2 className="w-4 h-4" />削除
                  </Button>
                )}
                <Button variant="secondary" className="flex-1" onClick={() => setEditing(null)}>キャンセル</Button>
                <Button className="flex-1" onClick={handleSaveEdit}>保存する</Button>
              </div>
            </div>
          )}
        </Modal>
      </Page>
    </AppShell>
  )
}
