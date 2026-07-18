'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { Card, Chip, statusChipColor, Button, Field, TextInput, Select, Modal, Page, PageTitle, Empty, inputCls } from '@/components/ui'
import { listAircraft, upsertAircraft } from '@/lib/db'
import type { Aircraft, AircraftCategory, AircraftStatus } from '@/lib/types'
import { formatMinutes, aircraftStatusLabel } from '@/lib/utils'
import { Plus, Search, Pencil, ChevronRight } from 'lucide-react'

const emptyForm = {
  registration_number: '',
  aircraft_type: '',
  aircraft_category: 'glider' as AircraftCategory,
  aircraft_status: 'active' as AircraftStatus,
  is_visible: true,
  display_order: 99,
  aircraft_memo: '',
  aircraft_initial_airframe_time: 0,
  aircraft_initial_flight_count: 0,
  aircraft_initial_takeoff_count: 0,
  aircraft_initial_landing_count: 0,
}

const statusTabs: { value: '' | AircraftStatus; label: string }[] = [
  { value: '', label: 'すべて' },
  { value: 'active', label: '使用中' },
  { value: 'maintenance', label: '整備中' },
  { value: 'grounded', label: '飛行停止' },
  { value: 'retired', label: '退役' },
]

export default function AircraftPage() {
  const [aircraft, setAircraft] = useState<Aircraft[]>([])
  const reload = () => listAircraft().then(setAircraft).catch(err => alert(err.message))
  useEffect(() => { reload() }, [])
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | AircraftStatus>('')
  const [formOpen, setFormOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [detail, setDetail] = useState<Aircraft | null>(null)
  const [form, setForm] = useState(emptyForm)

  const filtered = aircraft.filter(a => {
    if (statusFilter && a.aircraft_status !== statusFilter) return false
    if (query && !a.registration_number.toLowerCase().includes(query.toLowerCase()) && !a.aircraft_type.toLowerCase().includes(query.toLowerCase())) return false
    return true
  }).sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99))

  function openNew() {
    setEditId(null)
    setForm(emptyForm)
    setFormOpen(true)
  }
  function openEdit(a: Aircraft) {
    setEditId(a.id)
    setForm({
      registration_number: a.registration_number,
      aircraft_type: a.aircraft_type,
      aircraft_category: a.aircraft_category,
      aircraft_status: a.aircraft_status,
      is_visible: a.is_visible,
      display_order: a.display_order ?? 99,
      aircraft_memo: a.aircraft_memo ?? '',
      aircraft_initial_airframe_time: a.aircraft_initial_airframe_time,
      aircraft_initial_flight_count: a.aircraft_initial_flight_count,
      aircraft_initial_takeoff_count: a.aircraft_initial_takeoff_count,
      aircraft_initial_landing_count: a.aircraft_initial_landing_count,
    })
    setDetail(null)
    setFormOpen(true)
  }

  async function handleSave() {
    if (!form.registration_number || !form.aircraft_type) {
      alert('機体番号と機種は必須です')
      return
    }
    const now = new Date().toISOString()
    const reg = form.registration_number.toUpperCase()
    try {
      const base = editId ? aircraft.find(a => a.id === editId)! : { id: `a${Date.now()}`, created_at: now }
      await upsertAircraft({ ...base, ...form, registration_number: reg, updated_at: now } as Aircraft)
      await reload()
      setFormOpen(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存に失敗しました')
    }
  }

  return (
    <AppShell>
      <Page>
        <PageTitle action={<Button onClick={openNew}><Plus className="w-4 h-4" />機体追加</Button>}>機体一覧</PageTitle>

        {/* 検索 + 状態フィルタ */}
        <Card className="p-3.5 mb-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <TextInput value={query} onChange={e => setQuery(e.target.value)} placeholder="機体番号・機種で検索" className="pl-9" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {statusTabs.map(t => (
              <button key={t.value}
                onClick={() => setStatusFilter(t.value)}
                className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition ${
                  statusFilter === t.value ? 'bg-blue-600 text-white font-medium' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                {t.label}
                <span className="ml-1 opacity-70">
                  {t.value === '' ? aircraft.length : aircraft.filter(a => a.aircraft_status === t.value).length}
                </span>
              </button>
            ))}
          </div>
        </Card>

        {/* モバイル: カードリスト */}
        <div className="md:hidden space-y-2.5">
          {filtered.length === 0 && <Card><Empty>該当する機体がありません</Empty></Card>}
          {filtered.map(a => (
            <Card key={a.id} className="p-4 active:bg-slate-50" >
              <button className="w-full text-left" onClick={() => setDetail(a)}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="font-bold">{a.registration_number}</div>
                  <div className="flex items-center gap-1.5">
                    <Chip color={statusChipColor(a.aircraft_status)}>{aircraftStatusLabel(a.aircraft_status)}</Chip>
                    <ChevronRight className="w-4 h-4 text-slate-300" />
                  </div>
                </div>
                <div className="text-sm text-slate-600">{a.aircraft_type}</div>
                <div className="text-xs text-slate-400 mt-1">
                  機体時間 {formatMinutes(a.aircraft_initial_airframe_time)} / 着陸 {a.aircraft_initial_landing_count}回
                </div>
              </button>
            </Card>
          ))}
        </div>

        {/* デスクトップ: テーブル */}
        <Card className="hidden md:block overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-xs text-slate-500">
                  <th className="px-3 py-2.5 text-left">機体番号</th>
                  <th className="px-3 py-2.5 text-left">機種</th>
                                    <th className="px-3 py-2.5 text-left">状態</th>
                  <th className="px-3 py-2.5 text-right">機体時間</th>
                  <th className="px-3 py-2.5 text-right">フライト</th>
                  <th className="px-3 py-2.5 text-right">離陸</th>
                  <th className="px-3 py-2.5 text-right">着陸</th>
                  <th className="px-3 py-2.5 text-center">表示順</th>
                  <th className="px-3 py-2.5 text-center">表示</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr><td colSpan={10}><Empty>該当する機体がありません</Empty></td></tr>
                )}
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setDetail(a)}>
                    <td className="px-3 py-3 font-medium">{a.registration_number}</td>
                    <td className="px-3 py-3">{a.aircraft_type}</td>
                                        <td className="px-3 py-3"><Chip color={statusChipColor(a.aircraft_status)}>{aircraftStatusLabel(a.aircraft_status)}</Chip></td>
                    <td className="px-3 py-3 text-right font-mono">{formatMinutes(a.aircraft_initial_airframe_time)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{a.aircraft_initial_flight_count}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{a.aircraft_initial_takeoff_count}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{a.aircraft_initial_landing_count}</td>
                    <td className="px-3 py-3 text-center tabular-nums text-slate-500">{a.display_order ?? '—'}</td>
                    <td className="px-3 py-3 text-center text-slate-400">{a.is_visible ? '○' : '−'}</td>
                    <td className="px-3 py-3 text-right">
                      <button onClick={e => { e.stopPropagation(); openEdit(a) }} className="text-slate-400 hover:text-blue-600 p-1">
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="text-xs text-slate-400 mt-3">※ 機体は物理削除しません。運用を止める場合は状態を「飛行停止」または「退役」に変更してください。</p>

        {/* 詳細モーダル */}
        <Modal open={!!detail} onClose={() => setDetail(null)} title="機体詳細">
          {detail && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-bold">{detail.registration_number}</div>
                  <div className="text-sm text-slate-500">{detail.aircraft_type}</div>
                </div>
                <Chip color={statusChipColor(detail.aircraft_status)}>{aircraftStatusLabel(detail.aircraft_status)}</Chip>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  ['機体時間', formatMinutes(detail.aircraft_initial_airframe_time)],
                  ['フライト回数', `${detail.aircraft_initial_flight_count}回`],
                  ['離陸回数', `${detail.aircraft_initial_takeoff_count}回`],
                  ['着陸回数', `${detail.aircraft_initial_landing_count}回`],
                ].map(([k, v]) => (
                  <div key={k} className="bg-slate-50 rounded-xl px-3 py-2.5">
                    <div className="text-[11px] text-slate-500">{k}</div>
                    <div className="font-mono font-bold">{v}</div>
                  </div>
                ))}
              </div>
              {detail.aircraft_memo && (
                <div className="bg-amber-50 text-amber-800 rounded-xl px-3 py-2.5 text-sm">{detail.aircraft_memo}</div>
              )}
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setDetail(null)}>閉じる</Button>
                <Button className="flex-1" onClick={() => openEdit(detail)}><Pencil className="w-4 h-4" />編集</Button>
              </div>
            </div>
          )}
        </Modal>

        {/* 追加・編集モーダル */}
        <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editId ? '機体編集' : '機体追加'}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="機体番号" required>
              <TextInput value={form.registration_number} onChange={e => setForm(p => ({ ...p, registration_number: e.target.value }))} placeholder="JA1234" className="uppercase" />
            </Field>
            <Field label="機種" required>
              <TextInput value={form.aircraft_type} onChange={e => setForm(p => ({ ...p, aircraft_type: e.target.value }))} placeholder="ASK-21" />
            </Field>
            <Field label="使用状態">
              <Select value={form.aircraft_status} onChange={e => setForm(p => ({ ...p, aircraft_status: e.target.value as AircraftStatus }))}>
                <option value="active">使用中</option>
                <option value="maintenance">整備中</option>
                <option value="grounded">飛行停止</option>
                <option value="retired">退役</option>
              </Select>
            </Field>
            <Field label="表示順（小さいほど上）">
              <TextInput type="number" min={1} value={form.display_order} onChange={e => setForm(p => ({ ...p, display_order: Number(e.target.value) }))} />
            </Field>
            <Field label="初期機体時間(分)">
              <TextInput type="number" value={form.aircraft_initial_airframe_time} onChange={e => setForm(p => ({ ...p, aircraft_initial_airframe_time: Number(e.target.value) }))} />
            </Field>
            <Field label="初期フライト数">
              <TextInput type="number" value={form.aircraft_initial_flight_count} onChange={e => setForm(p => ({ ...p, aircraft_initial_flight_count: Number(e.target.value) }))} />
            </Field>
            <Field label="初期離陸回数">
              <TextInput type="number" value={form.aircraft_initial_takeoff_count} onChange={e => setForm(p => ({ ...p, aircraft_initial_takeoff_count: Number(e.target.value) }))} />
            </Field>
            <Field label="初期着陸回数">
              <TextInput type="number" value={form.aircraft_initial_landing_count} onChange={e => setForm(p => ({ ...p, aircraft_initial_landing_count: Number(e.target.value) }))} />
            </Field>
            <Field label="備考" className="col-span-2">
              <textarea value={form.aircraft_memo} onChange={e => setForm(p => ({ ...p, aircraft_memo: e.target.value }))} rows={2} className={inputCls} placeholder="整備予定・特記事項など" />
            </Field>
            <label className="col-span-2 flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={form.is_visible} onChange={e => setForm(p => ({ ...p, is_visible: e.target.checked }))} className="rounded" />
              発航記録の機体選択に表示する
            </label>
          </div>
          <div className="flex gap-2 mt-5">
            <Button variant="secondary" className="flex-1" onClick={() => setFormOpen(false)}>キャンセル</Button>
            <Button className="flex-1" onClick={handleSave}>保存する</Button>
          </div>
        </Modal>
      </Page>
    </AppShell>
  )
}
