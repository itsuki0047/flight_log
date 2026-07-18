'use client'
import { useEffect, useMemo, useState } from 'react'
import AppShell from '@/components/AppShell'
import {
  Card, CardHeader, Chip, statusChipColor, Button, Field, TextInput, Select,
  QuickPicks, Modal, Page, Empty, inputCls,
} from '@/components/ui'
import { listFlights, listAircraft, listUsers, listSubjects, listLaunchMethods, getOrganization, createFlight, updateFlight } from '@/lib/db'
import type { Flight, PicType, Aircraft, User, FlightSubject, LaunchMethod, Organization } from '@/lib/types'
import { formatTime, formatMinutes, flightStatusLabel } from '@/lib/utils'
import { PlaneTakeoff, PlaneLanding, RotateCcw, Clock } from 'lucide-react'

const emptyForm = {
  aircraft_id: '',
  pilot_name: '',
  instructor_name: '',
  copilot_name: '',
  subject_id: '',
  launch_method_id: '',
  departure_place: '大利根飛行場',
  arrival_place: '大利根飛行場',
  pic_type: 'Dual' as PicType,
  route: '',
  departure_hhmm: '',
  supplementary_note: '',
}

const emptyLanding = {
  departure_hhmm: '', arrival_time: '', release_altitude: '', max_altitude: '',
  landing_count: 1, xc_min: '', note: '',
}

function nowHhmm() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function FlightsPage() {
  const today = new Date().toISOString().split('T')[0]
  const [flights, setFlights] = useState<Flight[]>([])
  const [aircraftList, setAircraftList] = useState<Aircraft[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [subjects, setSubjects] = useState<FlightSubject[]>([])
  const [launchMethods, setLaunchMethods] = useState<LaunchMethod[]>([])
  const [org, setOrg] = useState<Organization | null>(null)
  const [form, setForm] = useState(emptyForm)
  const instructors = useMemo(() => users.filter(u => u.role === 'instructor' || u.role === 'admin'), [users])

  const reload = () => listFlights().then(setFlights).catch(err => console.error(err))
  useEffect(() => {
    reload()
    listAircraft().then(setAircraftList).catch(() => {})
    listUsers().then(setUsers).catch(() => {})
    listSubjects().then(setSubjects).catch(() => {})
    listLaunchMethods().then(l => {
      setLaunchMethods(l)
      setForm(p => (p.launch_method_id && l.some(x => x.id === p.launch_method_id)) ? p : { ...p, launch_method_id: l[0]?.id ?? '' })
    }).catch(() => {})
    getOrganization().then(setOrg).catch(() => {})
  }, [])
  const [landingTarget, setLandingTarget] = useState<Flight | null>(null)
  const [landing, setLanding] = useState(emptyLanding)

  const todayFlights = flights
    .filter(f => f.departure_time.startsWith(today))
    .sort((a, b) => b.departure_time.localeCompare(a.departure_time))
  const inFlight = flights.filter(f => f.flight_status === 'launched')

  async function handleLaunch() {
    const pilot = users.find(u => u.name === form.pilot_name.trim())
    const instructor = instructors.find(u => u.name === form.instructor_name.trim())
    if (!form.aircraft_id || !form.subject_id || !form.launch_method_id) {
      alert('必須項目（機体・科目・発航方法）を入力してください')
      return
    }
    if (!pilot) {
      alert('搭乗者が見つかりません。登録済みの氏名を入力してください')
      return
    }
    if (form.instructor_name.trim() && !instructor) {
      alert('教官が見つかりません。登録済みの氏名を入力してください')
      return
    }
    // 発航時刻: 未入力なら日付のみ(時刻は空欄扱い)で記録し、あとから編集できる
    const departure_time = form.departure_hhmm
      ? (() => { const d = new Date(); const [h, m] = form.departure_hhmm.split(':').map(Number); d.setHours(h, m, 0, 0); return d.toISOString() })()
      : today
    const now = new Date().toISOString()
    const newFlight: Flight = {
      id: `f${Date.now()}`,
      aircraft_id: form.aircraft_id,
      aircraft: aircraftList.find(a => a.id === form.aircraft_id),
      pilot_id: pilot.id,
      pilot,
      instructor_id: instructor?.id,
      instructor,
      copilot_name: form.copilot_name || undefined,
      subject_id: form.subject_id,
      subject: subjects.find(s => s.id === form.subject_id),
      launch_method_id: form.launch_method_id,
      launch_method: launchMethods.find(l => l.id === form.launch_method_id),
      departure_time,
      departure_place: form.departure_place,
      arrival_place: form.arrival_place,
      route: form.route || undefined,
      supplementary_note: form.supplementary_note || undefined,
      pic_type: form.pic_type,
      landing_count: 0,
      takeoff_count: 1,
      night_landing_count: 0,
      night_takeoff_count: 0,
      flight_status: 'launched',
      aircraft_category: 'glider',
      is_edited: false,
      created_by: pilot.id,
      created_at: now,
      updated_at: now,
    }
    try {
      await createFlight(newFlight)
      await reload()
      setForm({ ...emptyForm, launch_method_id: launchMethods[0]?.id ?? '' })
    } catch (err) {
      alert(err instanceof Error ? err.message : '発航の記録に失敗しました')
    }
  }

  function openLanding(f: Flight) {
    setLandingTarget(f)
    setLanding({
      ...emptyLanding,
      departure_hhmm: f.departure_time.includes('T') ? '' : nowHhmm(),
      arrival_time: nowHhmm(),
    })
  }

  async function handleLand() {
    if (!landingTarget) return
    const noDepTime = !landingTarget.departure_time.includes('T')
    if (noDepTime && !landing.departure_hhmm) {
      alert('発航時刻が未入力です。着陸記録には発航時刻が必要です')
      return
    }
    // 発航時刻が未入力だったフライトはここで確定させる
    let depIso = landingTarget.departure_time
    if (noDepTime) {
      const d = new Date(`${landingTarget.departure_time}T00:00:00`)
      const [h, m] = landing.departure_hhmm.split(':').map(Number)
      d.setHours(h, m, 0, 0)
      depIso = d.toISOString()
    }
    const dep = new Date(depIso)
    const arr = new Date(dep)
    const [h, m] = landing.arrival_time.split(':').map(Number)
    arr.setHours(h, m, 0, 0)
    if (arr < dep) arr.setDate(arr.getDate() + 1)
    const mins = Math.round((arr.getTime() - dep.getTime()) / 60000)
    const f = landingTarget
    const patch: Partial<Flight> = (() => ({
          departure_time: depIso,
          arrival_time: arr.toISOString(),
          flight_time: mins,
          flight_status: 'pending_approval',
          landing_count: landing.landing_count,
          release_altitude: landing.release_altitude ? Number(landing.release_altitude) : f.release_altitude,
          max_altitude: landing.max_altitude ? Number(landing.max_altitude) : f.max_altitude,
          cross_country_time: landing.xc_min ? Number(landing.xc_min) : f.cross_country_time,
          supplementary_note: landing.note ? `${f.supplementary_note ?? ''}${f.supplementary_note ? ' / ' : ''}${landing.note}` : f.supplementary_note,
          ...(f.pic_type === 'Dual' ? { dual_instruction_time: mins } : f.pic_type === 'Solo' ? { solo_time: mins } : { pic_time: mins }),
          updated_at: new Date().toISOString(),
        }))()
    try {
      await updateFlight(f.id, patch)
      await reload()
      setLandingTarget(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : '着陸の記録に失敗しました')
    }
  }

  const selectedAircraft = aircraftList.find(a => a.id === form.aircraft_id)

  return (
    <AppShell>
      <Page>
        {/* 搭乗者・教官の検索候補 */}
        <datalist id="pilot-list">
          {users.map(u => <option key={u.id} value={u.name} />)}
        </datalist>
        <datalist id="instructor-list">
          {instructors.map(u => <option key={u.id} value={u.name} />)}
        </datalist>

        {/* 飛行中 — 最優先で表示 */}
        {inFlight.length > 0 && (
          <Card className="mb-4 border-blue-200 bg-blue-50/60">
            <CardHeader icon={PlaneTakeoff} title={`飛行中 (${inFlight.length}機)`} className="border-blue-100" />
            <div className="divide-y divide-blue-100">
              {inFlight.map(f => (
                <div key={f.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold">
                      {f.aircraft?.registration_number}
                      <span className="ml-2 font-normal text-slate-600">{f.pilot?.name}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatTime(f.departure_time)} 発航 ・ {f.subject?.name} ・ {f.launch_method?.name}
                    </div>
                  </div>
                  <Button variant="success" size="sm" onClick={() => openLanding(f)}>
                    <PlaneLanding className="w-4 h-4" />着陸入力
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-5 gap-4 items-start">
          {/* 発航情報入力 */}
          <Card className="lg:col-span-3">
            <CardHeader icon={PlaneTakeoff} title="発航情報を入力" action={
              <button onClick={() => setForm({ ...emptyForm, launch_method_id: launchMethods[0]?.id ?? '' })} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                <RotateCcw className="w-3.5 h-3.5" />クリア
              </button>
            } />
            <div className="p-4 grid grid-cols-2 gap-3">
              <Field label="機体" required>
                <Select value={form.aircraft_id} onChange={e => setForm(p => ({ ...p, aircraft_id: e.target.value }))}>
                  <option value="">選択してください</option>
                  {aircraftList.filter(a => a.aircraft_status === 'active' && a.is_visible).map(a => (
                    <option key={a.id} value={a.id}>{a.registration_number} ({a.aircraft_type})</option>
                  ))}
                </Select>
              </Field>
              <Field label="発航方法" required>
                <Select value={form.launch_method_id} onChange={e => setForm(p => ({ ...p, launch_method_id: e.target.value }))}>
                  {launchMethods.filter(l => l.is_active).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </Select>
              </Field>
              <Field label="搭乗者（氏名で検索）" required>
                <TextInput list="pilot-list" value={form.pilot_name}
                  onChange={e => setForm(p => ({ ...p, pilot_name: e.target.value }))} placeholder="氏名を入力して検索" />
              </Field>
              <Field label="教官（氏名で検索）">
                <TextInput list="instructor-list" value={form.instructor_name}
                  onChange={e => setForm(p => ({ ...p, instructor_name: e.target.value }))} placeholder="なし（単独等）" />
              </Field>
              <Field label="飛行科目" required>
                <Select value={form.subject_id} onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))}>
                  <option value="">選択してください</option>
                  {subjects.filter(s => s.is_active).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
              <Field label="PIC区分">
                <Select value={form.pic_type} onChange={e => setForm(p => ({ ...p, pic_type: e.target.value as PicType }))}>
                  <option value="Dual">同乗教育 (Dual)</option>
                  <option value="Solo">単独 (Solo)</option>
                  <option value="PIC">機長 (PIC)</option>
                </Select>
              </Field>
              <Field label="発航時刻（未入力のまま発航も可）">
                <div className="flex gap-1.5">
                  <TextInput type="time" value={form.departure_hhmm}
                    onChange={e => setForm(p => ({ ...p, departure_hhmm: e.target.value }))} />
                  <Button type="button" variant="secondary" size="sm" className="shrink-0"
                    onClick={() => setForm(p => ({ ...p, departure_hhmm: nowHhmm() }))}>
                    <Clock className="w-3.5 h-3.5" />今
                  </Button>
                </div>
              </Field>
              <Field label="同乗者">
                <TextInput value={form.copilot_name} onChange={e => setForm(p => ({ ...p, copilot_name: e.target.value }))} placeholder="氏名（任意）" />
              </Field>
              <div>
                <Field label="出発地">
                  <TextInput value={form.departure_place} onChange={e => setForm(p => ({ ...p, departure_place: e.target.value }))} />
                </Field>
                <QuickPicks options={org?.default_departure_airports ?? []} onPick={v => setForm(p => ({ ...p, departure_place: v }))} />
              </div>
              <div>
                <Field label="到着地">
                  <TextInput value={form.arrival_place} onChange={e => setForm(p => ({ ...p, arrival_place: e.target.value }))} />
                </Field>
                <QuickPicks options={org?.default_arrival_airports ?? []} onPick={v => setForm(p => ({ ...p, arrival_place: v }))} />
              </div>
              <Field label="経路">
                <TextInput value={form.route} onChange={e => setForm(p => ({ ...p, route: e.target.value }))} placeholder="場周 / 大利根→板倉 など" />
              </Field>
              <Field label="補足事項">
                <TextInput value={form.supplementary_note} onChange={e => setForm(p => ({ ...p, supplementary_note: e.target.value }))} placeholder="任意" />
              </Field>
              {selectedAircraft && selectedAircraft.aircraft_status !== 'active' && (
                <div className="col-span-2 text-xs text-red-600">この機体は現在使用できません</div>
              )}
              <div className="col-span-2 mt-1">
                <Button size="lg" onClick={handleLaunch}>
                  <PlaneTakeoff className="w-4 h-4" />発航を記録する
                </Button>
              </div>
            </div>
          </Card>

          {/* 今日の記録 */}
          <Card className="lg:col-span-2">
            <CardHeader icon={Clock} title={`発航記録一覧（今日 ${todayFlights.length}件）`} />
            <div className="divide-y divide-slate-100">
              {todayFlights.length === 0 && <Empty>本日の記録はまだありません</Empty>}
              {todayFlights.map(f => (
                <div key={f.id} className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold">{formatTime(f.departure_time)}</span>
                    <span className="text-sm font-medium">{f.aircraft?.registration_number}</span>
                    <span className="text-xs text-slate-500">({f.aircraft?.aircraft_type})</span>
                    <span className="ml-auto">
                      <Chip color={statusChipColor(f.flight_status)}>{flightStatusLabel(f.flight_status)}</Chip>
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-2">
                    <span>{f.pilot?.name}{f.instructor ? ` / ${f.instructor.name}` : ''}</span>
                    <span>{f.subject?.name}</span>
                    <span>{f.launch_method?.name}</span>
                    {f.flight_time != null && <span className="font-mono">{formatMinutes(f.flight_time)}</span>}
                  </div>
                  {f.flight_status === 'launched' && (
                    <div className="mt-2">
                      <Button variant="success" size="sm" onClick={() => openLanding(f)}>
                        <PlaneLanding className="w-3.5 h-3.5" />着陸入力
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 着陸入力モーダル */}
        <Modal open={!!landingTarget} onClose={() => setLandingTarget(null)} title="着陸入力">
          {landingTarget && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm">
                <div className="font-bold">{landingTarget.aircraft?.registration_number} <span className="font-normal text-slate-500">{landingTarget.aircraft?.aircraft_type}</span></div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {landingTarget.pilot?.name} ・ {formatTime(landingTarget.departure_time)} 発航 ・ {landingTarget.subject?.name}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {!landingTarget.departure_time.includes('T') && (
                  <Field label="発航時刻（未入力のため必須）" required>
                    <TextInput type="time" value={landing.departure_hhmm} onChange={e => setLanding(p => ({ ...p, departure_hhmm: e.target.value }))} />
                  </Field>
                )}
                <Field label="着陸時刻" required>
                  <TextInput type="time" value={landing.arrival_time} onChange={e => setLanding(p => ({ ...p, arrival_time: e.target.value }))} />
                </Field>
                <Field label="着陸回数">
                  <TextInput type="number" min={1} value={landing.landing_count} onChange={e => setLanding(p => ({ ...p, landing_count: Number(e.target.value) }))} />
                </Field>
                <Field label="離脱高度 (m)">
                  <TextInput type="number" value={landing.release_altitude} onChange={e => setLanding(p => ({ ...p, release_altitude: e.target.value }))} placeholder="300" />
                </Field>
                <Field label="最高高度 (m)">
                  <TextInput type="number" value={landing.max_altitude} onChange={e => setLanding(p => ({ ...p, max_altitude: e.target.value }))} placeholder="450" />
                </Field>
                <Field label="野外飛行時間 (分)">
                  <TextInput type="number" min={0} value={landing.xc_min} onChange={e => setLanding(p => ({ ...p, xc_min: e.target.value }))} placeholder="野外航法時のみ" />
                </Field>
                <Field label="補足事項の追記" className="col-span-2">
                  <textarea value={landing.note} onChange={e => setLanding(p => ({ ...p, note: e.target.value }))} rows={2} className={inputCls} />
                </Field>
              </div>
              <p className="text-xs text-slate-400">保存すると「承認待ち」になり、教官承認後に個人ログ・航空日誌へ反映されます。</p>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setLandingTarget(null)}>キャンセル</Button>
                <Button variant="success" className="flex-1" onClick={handleLand}><PlaneLanding className="w-4 h-4" />着陸を記録</Button>
              </div>
            </div>
          )}
        </Modal>
      </Page>
    </AppShell>
  )
}
