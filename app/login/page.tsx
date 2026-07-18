'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PlaneTakeoff, Mail, Lock, AlertCircle } from 'lucide-react'
import { Button, TextInput, Field } from '@/components/ui'
import { loginWithPassword, isSupabaseConfigured } from '@/lib/session'
import { mockUsers } from '@/lib/mock-data'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください')
      return
    }
    try {
      await loginWithPassword(email, password)
      router.replace('/home')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ログインに失敗しました')
    }
  }

  return (
    <div className="min-h-dvh bg-slate-100 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30 mb-4">
            <PlaneTakeoff className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold">フライトログ</h1>
          <p className="text-xs text-slate-400 mt-1">運航記録管理アプリ</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-600 text-xs rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
          <Field label="メールアドレス">
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <TextInput
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@mail.com"
                className="pl-9"
                autoComplete="email"
              />
            </div>
          </Field>
          <Field label="パスワード">
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <TextInput
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="パスワードを入力"
                className="pl-9"
                autoComplete="current-password"
              />
            </div>
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="rounded" />
            ログイン状態を保持する
          </label>
          <Button type="submit" size="lg">ログイン</Button>
          <div className="text-center">
            <Link href="/reset-password" className="text-xs text-blue-600 hover:underline">
              パスワードをお忘れの方はこちら
            </Link>
          </div>
        </form>

        <div className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center">
          <p className="text-xs text-slate-400 mb-3">アカウントをお持ちでない方</p>
          <Link href="/register">
            <Button variant="secondary" size="lg">新規登録</Button>
          </Link>
        </div>

        {/* モック環境用のヒント（DB接続時は非表示） */}
        {!isSupabaseConfigured() && (
          <div className="mt-4 text-center text-[11px] text-slate-400">
            デモ用アカウント: {mockUsers[0].email}（パスワード任意）
          </div>
        )}
      </div>
    </div>
  )
}
