// お知らせの配信データ層。
// Supabase の環境変数が設定されていれば notices テーブル
// (supabase/migrations/0001_notices.sql) を使い、
// 未設定の間は localStorage（モックデータをシード）で同じAPIを提供する。
// UI側はこのモジュールだけを見るので、Supabase接続時の差し替え作業は不要。
import { createClient } from './supabase'
import { mockNotices, type Notice } from './mock-data'

export type { Notice }

export interface NoticeInput {
  title: string
  body: string
  kind: Notice['kind']
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

/* ---------- localStorage フォールバック ---------- */
const LS_KEY = 'flightlog_notices'

function loadLocal(): Notice[] {
  if (typeof window === 'undefined') return mockNotices
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return [...mockNotices]
    return JSON.parse(raw)
  } catch {
    return [...mockNotices]
  }
}

const LOCAL_EVENT = 'flightlog:notices-changed'

function saveLocal(list: Notice[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(list))
  // モック運用でも開いている画面（ベル等）へ即時反映させる
  window.dispatchEvent(new Event(LOCAL_EVENT))
}

/* ---------- 公開API ---------- */
export async function fetchNotices(): Promise<Notice[]> {
  if (!isSupabaseConfigured()) {
    return loadLocal().sort((a, b) => b.date.localeCompare(a.date))
  }
  const supabase = createClient()
  const { data, error } = await supabase
    .from('notices')
    .select('id, title, body, kind, published_at, expires_at')
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('published_at', { ascending: false })
    .limit(20)
  if (error) throw new Error(`お知らせの取得に失敗しました: ${error.message}`)
  return (data ?? []).map(r => ({
    id: r.id,
    title: r.title,
    body: r.body,
    kind: r.kind,
    date: String(r.published_at).slice(0, 10),
  }))
}

export async function createNotice(input: NoticeInput): Promise<void> {
  if (!isSupabaseConfigured()) {
    const list = loadLocal()
    list.unshift({
      id: `n${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      ...input,
    })
    saveLocal(list)
    return
  }
  const supabase = createClient()
  const { error } = await supabase.from('notices').insert(input)
  if (error) throw new Error(`お知らせの投稿に失敗しました: ${error.message}`)
}

export async function deleteNotice(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    saveLocal(loadLocal().filter(n => n.id !== id))
    return
  }
  const supabase = createClient()
  const { error } = await supabase.from('notices').delete().eq('id', id)
  if (error) throw new Error(`お知らせの削除に失敗しました: ${error.message}`)
}

// Realtime購読。開いている画面に即時反映する。戻り値は購読解除関数。
// Supabase接続時はpostgres_changes、モック運用時はローカルイベントを購読する。
export function subscribeNotices(onChange: () => void): () => void {
  if (!isSupabaseConfigured()) {
    window.addEventListener(LOCAL_EVENT, onChange)
    return () => window.removeEventListener(LOCAL_EVENT, onChange)
  }
  const supabase = createClient()
  const channel = supabase
    .channel('notices-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'notices' }, onChange)
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}
