'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button, TextInput, Field } from '@/components/ui'
import { registerUser } from '@/lib/session'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', org: '大学航空部', invite: '', email: '', password: '', agree: false })
  const [error, setError] = useState('')

  const pwOk = form.password.length >= 8 && /[a-zA-Z]/.test(form.password) && /[0-9]/.test(form.password)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) {
      setError('必須項目を入力してください')
      return
    }
    if (!pwOk) {
      setError('パスワードの条件を満たしていません')
      return
    }
    if (!form.agree) {
      setError('利用規約への同意が必要です')
      return
    }
    try {
      const { needsEmailConfirm } = await registerUser({
        name: form.name, email: form.email, password: form.password, inviteCode: form.invite,
      })
      if (needsEmailConfirm) {
        setError('')
        alert('確認メールを送信しました。メール内のリンクから登録を完了してください。')
        router.replace('/login')
      } else {
        router.replace('/home')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登録に失敗しました')
    }
  }

  return (
    <div className="min-h-dvh bg-slate-100 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-5">
          <Link href="/login" className="p-1 text-slate-500 hover:text-slate-800" aria-label="戻る">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold">新規登録</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-600 text-xs rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}
          <Field label="氏名" required>
            <TextInput value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="小野 太郎" />
          </Field>
          <Field label="招待コード（団体から共有されたコード）">
            <TextInput value={form.invite} onChange={e => setForm(p => ({ ...p, invite: e.target.value.toUpperCase() }))}
              placeholder="例: A3K7MN2P（任意）" className="font-mono tracking-wider uppercase" />
            <p className="text-[11px] text-slate-400 mt-1">入力すると団体のメンバーとして紐付きます。あとから設定でも参加できます。</p>
          </Field>
          <Field label="メールアドレス" required>
            <TextInput type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="example@mail.com" />
          </Field>
          <Field label="パスワード" required>
            <TextInput type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="8文字以上の英数字" />
            <div className={`flex items-center gap-1.5 mt-1.5 text-[11px] ${pwOk ? 'text-emerald-600' : 'text-slate-400'}`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              8文字以上・英字と数字を含む
            </div>
          </Field>
          <label className="flex items-start gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={form.agree} onChange={e => setForm(p => ({ ...p, agree: e.target.checked }))} className="rounded mt-0.5" />
            <span>
              <a className="text-blue-600 hover:underline" href="#" onClick={e => e.preventDefault()}>利用規約</a>
              および
              <a className="text-blue-600 hover:underline" href="#" onClick={e => e.preventDefault()}>プライバシーポリシー</a>
              に同意します
            </span>
          </label>
          <Button type="submit" size="lg">登録する</Button>
          <div className="text-center">
            <Link href="/login" className="text-xs text-blue-600 hover:underline">ログイン画面に戻る</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
