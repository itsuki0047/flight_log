'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MailCheck, Mail } from 'lucide-react'
import { Button, TextInput, Field } from '@/components/ui'
import { sendPasswordReset } from '@/lib/session'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <div className="min-h-dvh bg-slate-100 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-5">
          <Link href="/login" className="p-1 text-slate-500 hover:text-slate-800" aria-label="戻る">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-bold">パスワード再設定</h1>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-3">
              <MailCheck className="w-7 h-7 text-blue-600" />
            </div>
            <h2 className="font-bold">パスワードをお忘れですか？</h2>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              登録済みのメールアドレスを入力してください。<br />
              パスワード再設定用のリンクをお送りします。
            </p>
          </div>

          {sent ? (
            <div className="bg-emerald-50 text-emerald-700 text-sm rounded-xl px-4 py-3 text-center">
              再設定メールを送信しました。<br />
              <span className="text-xs">メールが届かない場合は迷惑メールフォルダをご確認ください。</span>
            </div>
          ) : (
            <form
              onSubmit={async e => {
                e.preventDefault()
                if (!email) return
                try {
                  await sendPasswordReset(email)
                  setSent(true)
                } catch (err) {
                  alert(err instanceof Error ? err.message : '送信に失敗しました')
                }
              }}
              className="space-y-4"
            >
              <Field label="メールアドレス">
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <TextInput
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="example@mail.com"
                    className="pl-9"
                  />
                </div>
              </Field>
              <Button type="submit" size="lg">再設定メールを送信</Button>
            </form>
          )}

          <div className="text-center mt-4">
            <Link href="/login" className="text-xs text-blue-600 hover:underline">ログイン画面に戻る</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
