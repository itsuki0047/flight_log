import { createBrowserClient } from '@supabase/ssr'

// Supabase 接続用クライアント。.env.local に以下を設定すると有効になる:
//   NEXT_PUBLIC_SUPABASE_URL=...
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
// 未設定の場合は null を返し、アプリはモックデータで動作する。
export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createBrowserClient(url, key)
}
