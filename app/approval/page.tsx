'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { Card, CardHeader, Chip, statusChipColor, Button, Modal, Page, PageTitle, Empty, Field, inputCls } from '@/components/ui'
import { listFlights, updateFlight } from '@/lib/db'
import type { Flight } from '@/lib/types'
import { formatDate, formatTime, formatMinutes, flightStatusLabel } from '@/lib/utils'
import { CheckCircle2, Undo2, CheckSquare, ShieldCheck } from 'lucide-react'

export default function ApprovalPage() {
  const [flights, setFlights] = useState<Flight[]>([])
  const reload = () => listFlights().then(setFlights).catch(err => console.error(err))
  useEffect(() => { reload() }, [])
  const [rejecting, setRejecting] = useState<Flight | null>(null)
  const [reason, setReason] = useState('')

  const pending = flights.filter(f => f.flight_status === 'pending_approval')
  const recentlyApproved = flights
    .filter(f => f.flight_status === 'approved')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 10)

  async function approve(id: string) {
    try {
      await updateFlight(id, { flight_status: 'approved' })
      await reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : '承認に失敗しました')
    }
  }

  async function approveAll() {
    if (!confirm(`承認待ち ${pending.length}件をすべて承認しますか？`)) return
    try {
      for (const f of pending) {
        await updateFlight(f.id, { flight_status: 'approved' })
      }
      await reload()
    } catch (err) {
      alert(err instanceof Error ? err.message : '一括承認に失敗しました')
    }
  }

  async function reject() {
    if (!rejecting) return
    try {
      await updateFlight(rejecting.id, {
        flight_status: 'landed',
        flights_memo: `【差戻し】${reason}${rejecting.flights_memo ? ` / ${rejecting.flights_memo}` : ''}`,
      })
      await reload()
      setRejecting(null)
      setReason('')
    } catch (err) {
      alert(err instanceof Error ? err.message : '差戻しに失敗しました')
    }
  }

  return (
    <AppShell>
      <Page>
        <PageTitle action={
          pending.length > 0 && (
            <Button variant="success" onClick={approveAll}>
              <CheckSquare className="w-4 h-4" />一括承認 ({pending.length})
            </Button>
          )
        }>教官承認</PageTitle>

        {/* 承認待ち */}
        <Card className="mb-4">
          <CardHeader icon={ShieldCheck} title={`承認待ち (${pending.length}件)`} />
          <div className="divide-y divide-slate-100">
            {pending.length === 0 && <Empty>承認待ちのフライトはありません 🎉</Empty>}
            {pending.map(f => (
              <div key={f.id} className="px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-1.5">
                  <span className="text-xs text-slate-400">{formatDate(f.departure_time)}</span>
                  <span className="font-bold text-sm">{f.aircraft?.registration_number}</span>
                  <span className="text-sm">{f.pilot?.name}</span>
                  {f.is_edited && <Chip color="orange">編集済</Chip>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mb-2.5">
                  {([
                    ['区間', `${f.departure_place} → ${f.arrival_place}`],
                    ['発航 / 着陸', `${formatTime(f.departure_time)} / ${f.arrival_time ? formatTime(f.arrival_time) : '--:--'}`],
                    ['飛行時間', f.flight_time != null ? formatMinutes(f.flight_time) : '—'],
                    ['科目', f.subject?.name ?? '—'],
                    ['発航方法', f.launch_method?.name ?? '—'],
                    ['PIC区分', f.pic_type],
                    ['同乗者', f.copilot_name ?? '—'],
                    ['着陸回数', `${f.landing_count}回`],
                    ['離脱高度', f.release_altitude ? `${f.release_altitude}m` : '—'],
                    ['最高高度', f.max_altitude ? `${f.max_altitude}m` : '—'],
                    ['野外飛行', f.cross_country_time ? formatMinutes(f.cross_country_time) : '—'],
                    ['経路', f.route ?? '—'],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="bg-slate-50 rounded-lg px-2 py-1.5">
                      <div className="text-[10px] text-slate-400">{k}</div>
                      <div className="text-xs font-medium">{v}</div>
                    </div>
                  ))}
                  {f.supplementary_note && (
                    <div className="col-span-2 sm:col-span-4 bg-blue-50 rounded-lg px-2 py-1.5">
                      <div className="text-[10px] text-slate-400">補足事項</div>
                      <div className="text-xs">{f.supplementary_note}</div>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="success" size="sm" onClick={() => approve(f.id)}>
                    <CheckCircle2 className="w-4 h-4" />承認
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => { setRejecting(f); setReason('') }}>
                    <Undo2 className="w-4 h-4" />差戻し
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 最近承認したフライト */}
        <Card>
          <CardHeader icon={CheckCircle2} title="最近の承認済みフライト" />
          <div className="divide-y divide-slate-100">
            {recentlyApproved.length === 0 && <Empty>承認済みのフライトはありません</Empty>}
            {recentlyApproved.map(f => (
              <div key={f.id} className="px-4 py-3 flex items-center gap-3">
                <span className="text-xs text-slate-400 shrink-0">{formatDate(f.departure_time)}</span>
                <div className="min-w-0 flex-1 text-sm truncate">
                  <span className="font-medium">{f.aircraft?.registration_number}</span>
                  <span className="ml-2 text-slate-600">{f.pilot?.name} ・ {f.subject?.name}</span>
                </div>
                <span className="font-mono text-xs text-slate-500">{f.flight_time != null ? formatMinutes(f.flight_time) : ''}</span>
                <Chip color={statusChipColor(f.flight_status)}>{flightStatusLabel(f.flight_status)}</Chip>
              </div>
            ))}
          </div>
        </Card>

        {/* 差戻しモーダル */}
        <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="差戻し（修正依頼）">
          {rejecting && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm">
                <span className="font-bold">{rejecting.aircraft?.registration_number}</span>
                <span className="ml-2">{rejecting.pilot?.name}</span>
                <span className="ml-2 text-slate-500">{formatDate(rejecting.departure_time)}</span>
              </div>
              <Field label="差戻し理由" required>
                <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} className={inputCls}
                  placeholder="例: 着陸時刻が実際と異なるため修正してください" />
              </Field>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setRejecting(null)}>キャンセル</Button>
                <Button variant="danger" className="flex-1" onClick={reject} disabled={!reason}>差戻す</Button>
              </div>
            </div>
          )}
        </Modal>
      </Page>
    </AppShell>
  )
}
