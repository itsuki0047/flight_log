import { createClient } from './supabase'
import { mockUsers } from './mock-data'
import type { User } from './types'

// 認証層。Supabase の環境変数が設定されていれば Supabase Auth
// (email+password) を使い、未設定の間は localStorage のモック認証で動く。
const KEY = 'flightlog_session_user_id'

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

/* ---------- セッション取得 ---------- */
// 同期版（モック専用・後方互換）。Supabase接続時は null を返すので getSessionUserAsync を使うこと
export function getSessionUser(): User | null {
  if (typeof window === 'undefined') return null
  if (isSupabaseConfigured()) return null
  const id = localStorage.getItem(KEY)
  return mockUsers.find(u => u.id === id) ?? null
}

export async function getSessionUserAsync(): Promise<User | null> {
  if (typeof window === 'undefined') return null
  if (!isSupabaseConfigured()) {
    const id = localStorage.getItem(KEY)
    return mockUsers.find(u => u.id === id) ?? null
  }
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  return profile ?? null
}

/* ---------- ログイン ---------- */
export async function loginWithPassword(email: string, password: string): Promise<User> {
  if (!isSupabaseConfigured()) {
    const user = mockUsers.find(u => u.email === email)
    if (!user) throw new Error('メールアドレスまたはパスワードが正しくありません')
    localStorage.setItem(KEY, user.id)
    return user
  }
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error('メールアドレスまたはパスワードが正しくありません')
  const { data: profile } = await supabase.from('users').select('*').eq('id', data.user.id).single()
  if (!profile) throw new Error('ユーザープロフィールが見つかりません')
  return profile
}

/* ---------- 新規登録 ---------- */
export async function registerUser(input: {
  name: string
  email: string
  password: string
  inviteCode?: string
}): Promise<{ needsEmailConfirm: boolean }> {
  if (!isSupabaseConfigured()) {
    // モック環境では既存ユーザーとしてログイン
    localStorage.setItem(KEY, mockUsers[0].id)
    return { needsEmailConfirm: false }
  }
  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    // handle_new_user トリガがプロフィール作成と招待コードでの団体紐付けに使う
    options: { data: { name: input.name, invite_code: input.inviteCode ?? '' } },
  })
  if (error) throw new Error(`登録に失敗しました: ${error.message}`)
  return { needsEmailConfirm: !data.session }
}

/* ---------- パスワード再設定 ---------- */
export async function sendPasswordReset(email: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  const supabase = createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}${window.location.pathname.startsWith('/flight_log') ? '/flight_log' : ''}/login/`,
  })
  if (error) throw new Error(`送信に失敗しました: ${error.message}`)
}

/* ---------- パスワード変更（ログイン中のユーザー本人） ---------- */
export async function changePassword(newPassword: string): Promise<void> {
  if (!isSupabaseConfigured()) return
  const { error } = await createClient().auth.updateUser({ password: newPassword })
  if (error) throw new Error(`パスワードの変更に失敗しました: ${error.message}`)
}

/* ---------- ログアウト ---------- */
// 後方互換のため同期シグネチャを維持（Supabase時は投げっぱなしでサインアウト）
export function logout() {
  localStorage.removeItem(KEY)
  if (isSupabaseConfigured()) createClient().auth.signOut()
}

// 後方互換（モック用）
export function loginAs(userId: string) {
  localStorage.setItem(KEY, userId)
}
