import { createBrowserClient } from '@supabase/ssr'

// Supabase クライアント（Phase 5 でDB接続時に使用予定。現状はモックデータ運用）。
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}
