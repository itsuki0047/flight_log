// データアクセス層。お知らせ(lib/notices.ts)と同じ方針で、
// Supabase の環境変数が設定されていれば実テーブル
// (supabase/migrations/0002_core.sql) を使い、未設定の間は
// localStorage 永続のモックで同じAPIを提供する。
// 画面側はこのモジュールだけを見るので、DB接続時のコード変更は不要。
import { createClient } from './supabase'
import {
  mockUsers, mockAircraft, mockSubjects, mockLaunchMethods, mockFlights, mockOrganization,
} from './mock-data'
import type {
  User, Aircraft, Flight, FlightSubject, LaunchMethod,
  PersonalLogEntry, AircraftLogEntry, Organization,
} from './types'

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

/* ==================================================================
 * モック実装 (localStorage 永続。テスト運用でリロードしても消えない)
 * ================================================================== */
const LS_KEY = 'flightlog_db_v1'

interface MockStore {
  aircraft: Aircraft[]
  flights: Omit<Flight, 'aircraft' | 'pilot' | 'instructor' | 'subject' | 'launch_method'>[]
  org?: Organization
  subjects?: FlightSubject[]
}

function stripFlight(f: Flight): MockStore['flights'][number] {
  const { aircraft: _a, pilot: _p, instructor: _i, subject: _s, launch_method: _l, ...rest } = f
  return rest
}

function loadStore(): MockStore {
  if (typeof window === 'undefined') {
    return { aircraft: mockAircraft, flights: mockFlights.map(stripFlight) }
  }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* fallthrough */ }
  return { aircraft: [...mockAircraft], flights: mockFlights.map(stripFlight) }
}

function saveStore(store: MockStore) {
  if (typeof window === 'undefined') return
  localStorage.setItem(LS_KEY, JSON.stringify(store))
}

// 関連エンティティを紐付け直す
function hydrateFlight(raw: MockStore['flights'][number], aircraft: Aircraft[]): Flight {
  return {
    ...raw,
    aircraft: aircraft.find(a => a.id === raw.aircraft_id),
    pilot: mockUsers.find(u => u.id === raw.pilot_id),
    instructor: mockUsers.find(u => u.id === raw.instructor_id),
    subject: mockSubjects.find(s => s.id === raw.subject_id),
    launch_method: mockLaunchMethods.find(l => l.id === raw.launch_method_id),
  }
}

/* ==================================================================
 * Supabase 実装
 * ================================================================== */
const FLIGHT_SELECT = `*,
  aircraft (*),
  pilot:users!flights_pilot_id_fkey (*),
  instructor:users!flights_instructor_id_fkey (*),
  subject:flight_subjects (*),
  launch_method:launch_methods (*)`

// DB行 → アプリのFlight型（departure_time null は「時刻未入力」= 日付のみ文字列で表現）
function rowToFlight(r: Record<string, unknown>): Flight {
  const f = { ...r } as unknown as Flight & { flight_date?: string }
  if (!f.departure_time) f.departure_time = String(f.flight_date)
  // DBに無い（グライダー専用化で廃止した）列の既定値を補う
  f.aircraft_category = f.aircraft_category ?? 'glider'
  f.night_landing_count = f.night_landing_count ?? 0
  f.night_takeoff_count = f.night_takeoff_count ?? 0
  return f
}

// flights テーブルに実在する列（0001_core.sql と一致させること）。
// アプリ側だけにある項目(aircraft_category等)を送るとPostgRESTがエラーになるため、
// 書き込みはこのホワイトリストに限定する。
const FLIGHT_DB_COLUMNS = new Set([
  'organization_id', 'aircraft_id', 'pilot_id', 'instructor_id', 'copilot_name',
  'subject_id', 'launch_method_id', 'flight_date', 'departure_time', 'arrival_time',
  'flight_time', 'departure_place', 'arrival_place', 'route', 'landing_count',
  'takeoff_count', 'pic_type', 'flight_status', 'release_altitude', 'max_altitude',
  'cross_country_time', 'pic_time', 'solo_time', 'dual_instruction_time',
  'instruction_time', 'other_flight_time', 'supplementary_note', 'flights_memo',
  'is_edited', 'created_by', 'updated_at',
])

// アプリのFlight → DB行（日付のみのdeparture_timeは null に戻す）
function flightToRow(f: Partial<Flight>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(f)) {
    if (FLIGHT_DB_COLUMNS.has(key)) row[key] = value
  }
  if (typeof f.departure_time === 'string') {
    if (f.departure_time.includes('T')) {
      row.flight_date = f.departure_time.split('T')[0]
    } else {
      row.flight_date = f.departure_time
      row.departure_time = null
    }
  }
  return row
}

/* ==================================================================
 * 公開API
 * ================================================================== */

export async function listUsers(): Promise<User[]> {
  if (!isSupabaseConfigured()) return mockUsers
  const { data, error } = await createClient().from('users').select('*').eq('is_active', true).order('name')
  if (error) throw new Error(`ユーザーの取得に失敗しました: ${error.message}`)
  return data ?? []
}

export async function getOrganization(): Promise<Organization> {
  if (!isSupabaseConfigured()) return loadStore().org ?? mockOrganization
  const { data, error } = await createClient().from('organizations').select('*').limit(1).single()
  if (error) throw new Error(`団体情報の取得に失敗しました: ${error.message}`)
  return data
}

// 団体情報の更新（管理者のみ。要 0003_org_update.sql のRLSポリシー）
export async function updateOrganization(patch: Partial<Organization>): Promise<void> {
  if (!isSupabaseConfigured()) {
    const store = loadStore()
    store.org = { ...(store.org ?? mockOrganization), ...patch }
    saveStore(store)
    return
  }
  const supabase = createClient()
  const current = await getOrganization()
  const { id: _id, ...rest } = patch
  const { data, error } = await supabase
    .from('organizations')
    .update(rest)
    .eq('id', current.id)
    .select('id')
  if (error) throw new Error(`団体設定の保存に失敗しました: ${error.message}`)
  if (!data || data.length === 0) {
    throw new Error('団体設定を保存できませんでした（管理者権限とRLSポリシー 0003_org_update.sql の適用を確認してください）')
  }
}

// ユーザープロフィールの更新（本人または管理者。権限変更は管理者のみ想定）
export async function updateUserProfile(id: string, patch: Partial<Pick<User, 'name' | 'role' | 'is_active'>>): Promise<void> {
  if (!isSupabaseConfigured()) return // モックは静的データのため保存しない
  const { data, error } = await createClient().from('users').update(patch).eq('id', id).select('id')
  if (error) throw new Error(`ユーザー情報の保存に失敗しました: ${error.message}`)
  if (!data || data.length === 0) throw new Error('ユーザー情報を保存できませんでした（権限を確認してください）')
}

export async function listSubjects(): Promise<FlightSubject[]> {
  if (!isSupabaseConfigured()) {
    return (loadStore().subjects ?? mockSubjects).filter(s => s.is_active).sort((a, b) => a.display_order - b.display_order)
  }
  const { data, error } = await createClient().from('flight_subjects').select('*').eq('is_active', true).order('display_order')
  if (error) throw new Error(`科目の取得に失敗しました: ${error.message}`)
  return data ?? []
}

// 科目管理用（無効も含めて取得）
export async function listAllSubjects(): Promise<FlightSubject[]> {
  if (!isSupabaseConfigured()) {
    return (loadStore().subjects ?? mockSubjects).slice().sort((a, b) => a.display_order - b.display_order)
  }
  const { data, error } = await createClient().from('flight_subjects').select('*').order('display_order')
  if (error) throw new Error(`科目の取得に失敗しました: ${error.message}`)
  return data ?? []
}

// 飛行科目の追加・更新（管理者/運航管理者のみ。要 0005_roles_and_subjects.sql）
export async function upsertSubject(s: FlightSubject): Promise<void> {
  if (!isSupabaseConfigured()) {
    const store = loadStore()
    const list = store.subjects ?? [...mockSubjects]
    const i = list.findIndex(x => x.id === s.id)
    if (i >= 0) list[i] = s
    else list.push({ ...s, id: `s${Date.now()}` })
    store.subjects = list
    saveStore(store)
    return
  }
  const { id, ...rest } = s
  const isNew = !id || id.startsWith('s')
  const { data, error } = isNew
    ? await createClient().from('flight_subjects').insert(rest).select('id')
    : await createClient().from('flight_subjects').update(rest).eq('id', id).select('id')
  if (error) throw new Error(`科目の保存に失敗しました: ${error.message}`)
  if (!data || data.length === 0) {
    throw new Error('科目を保存できませんでした（運航管理者/adminの権限と 0005 の適用を確認してください）')
  }
}

export async function listLaunchMethods(): Promise<LaunchMethod[]> {
  if (!isSupabaseConfigured()) return mockLaunchMethods
  const { data, error } = await createClient().from('launch_methods').select('*').eq('is_active', true).order('display_order')
  if (error) throw new Error(`発航方法の取得に失敗しました: ${error.message}`)
  return data ?? []
}

export async function listAircraft(): Promise<Aircraft[]> {
  if (!isSupabaseConfigured()) return loadStore().aircraft
  const { data, error } = await createClient().from('aircraft').select('*').order('display_order')
  if (error) throw new Error(`機体の取得に失敗しました: ${error.message}`)
  return data ?? []
}

export async function upsertAircraft(a: Aircraft): Promise<void> {
  if (!isSupabaseConfigured()) {
    const store = loadStore()
    const i = store.aircraft.findIndex(x => x.id === a.id)
    if (i >= 0) store.aircraft[i] = a
    else store.aircraft.push(a)
    saveStore(store)
    return
  }
  const { id, created_at: _c, ...rest } = a
  const isNew = id.startsWith('a') // モック由来のIDは新規扱い（uuidはDB採番）
  const { error } = isNew
    ? await createClient().from('aircraft').insert(rest)
    : await createClient().from('aircraft').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) throw new Error(`機体の保存に失敗しました: ${error.message}`)
}

export async function listFlights(): Promise<Flight[]> {
  if (!isSupabaseConfigured()) {
    const store = loadStore()
    return store.flights.map(f => hydrateFlight(f, store.aircraft))
  }
  const { data, error } = await createClient()
    .from('flights')
    .select(FLIGHT_SELECT)
    .order('flight_date', { ascending: false })
    .order('departure_time', { ascending: false, nullsFirst: false })
    .limit(1000)
  if (error) throw new Error(`フライトの取得に失敗しました: ${error.message}`)
  return (data ?? []).map(rowToFlight)
}

export async function createFlight(f: Flight): Promise<void> {
  if (!isSupabaseConfigured()) {
    const store = loadStore()
    store.flights.unshift(stripFlight(f))
    saveStore(store)
    return
  }
  const { error } = await createClient().from('flights').insert(flightToRow(f))
  if (error) throw new Error(`発航の記録に失敗しました: ${error.message}`)
}

export async function updateFlight(id: string, patch: Partial<Flight>): Promise<void> {
  if (!isSupabaseConfigured()) {
    const store = loadStore()
    store.flights = store.flights.map(f => (f.id === id ? { ...f, ...stripFlight({ ...hydrateFlight(f, store.aircraft), ...patch }) } : f))
    saveStore(store)
    return
  }
  const { error } = await createClient()
    .from('flights')
    .update({ ...flightToRow(patch), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(`フライトの更新に失敗しました: ${error.message}`)
}

// フライト削除（誤入力の取り消し用。管理者・教官のみ。要 0004_flights_delete.sql）
export async function deleteFlight(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const store = loadStore()
    store.flights = store.flights.filter(f => f.id !== id)
    saveStore(store)
    return
  }
  const { data, error } = await createClient().from('flights').delete().eq('id', id).select('id')
  if (error) throw new Error(`フライトの削除に失敗しました: ${error.message}`)
  if (!data || data.length === 0) {
    throw new Error('フライトを削除できませんでした（管理者/教官の権限と 0004_flights_delete.sql の適用を確認してください）')
  }
}

// テスト運用用: モックデータを初期状態に戻す
export function resetMockDb() {
  if (typeof window !== 'undefined') localStorage.removeItem(LS_KEY)
}

/* ==================================================================
 * 個人ログ・航空日誌（フライトからの派生ビュー）
 * flights を単一の情報源とし、着陸済み(到着時刻あり)の記録から生成する。
 * ================================================================== */
export function derivePersonalLogEntries(flights: Flight[]): PersonalLogEntry[] {
  return flights
    .filter(f => f.arrival_time)
    .map((f, i) => ({
      id: `ple-${f.id}`,
      flight_id: f.id,
      flight: f,
      user_id: f.pilot_id,
      aircraft_category: f.aircraft_category,
      date: f.departure_time.split('T')[0],
      aircraft_type: f.aircraft?.aircraft_type ?? '',
      registration_number: f.aircraft?.registration_number ?? '',
      departure_place: f.departure_place,
      arrival_place: f.arrival_place,
      departure_time: f.departure_time,
      arrival_time: f.arrival_time,
      flight_content: f.flight_content,
      landing_count: f.landing_count,
      night_landing_count: f.night_landing_count ?? 0,
      takeoff_count: f.takeoff_count,
      night_takeoff_count: f.night_takeoff_count ?? 0,
      total_flight_time: f.flight_time ?? 0,
      pic_time: f.pic_time,
      solo_time: f.solo_time,
      copilot_time: f.copilot_time,
      dual_instruction_time: f.dual_instruction_time,
      cross_country_pic_solo_picus_time: f.cross_country_time,
      other_flight_time: f.other_flight_time,
      instruction_time: f.instruction_time,
      instructor_id: f.instructor_id,
      instructor_name: f.instructor?.name,
      launch_method_id: f.launch_method_id,
      launch_method_name: f.launch_method?.name,
      supplementary_note: f.supplementary_note,
      memo: f.flights_memo,
      logbook_page_no: 1,
      row_no_in_page: i + 1,
      created_at: f.created_at,
    }))
}

export function deriveAircraftLogEntries(flights: Flight[], aircraft: Aircraft[]): AircraftLogEntry[] {
  const perAircraft = new Map<string, number>()
  return [...flights]
    .filter(f => f.arrival_time)
    .sort((a, b) => a.departure_time.localeCompare(b.departure_time))
    .map(f => {
      const ac = aircraft.find(a => a.id === f.aircraft_id) ?? f.aircraft
      const count = perAircraft.get(f.aircraft_id) ?? 0
      perAircraft.set(f.aircraft_id, count + 1)
      const baseTime = (ac?.aircraft_initial_airframe_time ?? 0)
        + [...flights].filter(x => x.aircraft_id === f.aircraft_id && x.arrival_time
            && x.departure_time < f.departure_time)
            .reduce((s, x) => s + (x.flight_time ?? 0), 0)
      return {
        id: `ale-${f.id}`,
        flight_id: f.id,
        aircraft_id: f.aircraft_id,
        aircraft: ac,
        aircraft_category: f.aircraft_category,
        aircraft_type: ac?.aircraft_type ?? '',
        registration_number: ac?.registration_number ?? '',
        date: f.departure_time.split('T')[0],
        departure_place: f.departure_place,
        arrival_place: f.arrival_place,
        departure_time: f.departure_time,
        arrival_time: f.arrival_time,
        flight_time: f.flight_time ?? 0,
        pilot_id: f.pilot_id,
        pilot_name: f.pilot?.name ?? '',
        instructor_id: f.instructor_id,
        instructor_name: f.instructor?.name,
        copilot_name: f.copilot_name,
        flight_content: f.flight_content,
        takeoff_count: f.takeoff_count,
        landing_count: f.landing_count,
        night_takeoff_count: f.night_takeoff_count ?? 0,
        night_landing_count: f.night_landing_count ?? 0,
        initial_airframe_time: baseTime,
        final_airframe_time: baseTime + (f.flight_time ?? 0),
        initial_flight_count: (ac?.aircraft_initial_flight_count ?? 0) + count,
        final_flight_count: (ac?.aircraft_initial_flight_count ?? 0) + count + 1,
        initial_landing_count: (ac?.aircraft_initial_landing_count ?? 0) + count,
        final_landing_count: (ac?.aircraft_initial_landing_count ?? 0) + count + f.landing_count,
        launch_method_name: f.launch_method?.name,
        release_altitude: f.release_altitude,
        max_altitude: f.max_altitude,
        supplementary_note: f.supplementary_note,
        memo: f.flights_memo,
        created_at: f.created_at,
      }
    })
    .sort((a, b) => b.departure_time.localeCompare(a.departure_time))
}
