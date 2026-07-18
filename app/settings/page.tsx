'use client'
import { useEffect, useState } from 'react'
import AppShell from '@/components/AppShell'
import { Card, Chip, Button, Field, TextInput, Select, Page, PageTitle } from '@/components/ui'
import type { Organization } from '@/lib/types'
import { listUsers, getOrganization, updateOrganization, updateUserProfile, listAllSubjects, upsertSubject } from '@/lib/db'
import type { FlightSubject } from '@/lib/types'
import { getSessionUserAsync, changePassword } from '@/lib/session'
import { fetchNotices, createNotice, deleteNotice, isSupabaseConfigured, type Notice } from '@/lib/notices'
import { inputCls } from '@/components/ui'
import {
  User as UserIcon, Home, Shield, Bell, ChevronRight, ChevronLeft, Building, Megaphone, Trash2, BookOpen, Plus,
} from 'lucide-react'
import type { User } from '@/lib/types'

type SectionId = 'user' | 'home' | 'org' | 'subjects' | 'notices' | 'role' | 'notify'

// roles を指定したセクションはその権限のユーザーにのみ表示する
const sections: { id: SectionId; label: string; desc: string; icon: React.ComponentType<{ className?: string }>; roles?: string[] }[] = [
  { id: 'user', label: 'ユーザー設定', desc: '名前・所属・テーマ・パスワード', icon: UserIcon },
  { id: 'home', label: 'ホーム表示設定', desc: '表示項目・表示順', icon: Home },
  { id: 'org', label: '団体設定', desc: 'よく使う離発着地など', icon: Building, roles: ['admin', 'manager'] },
  { id: 'subjects', label: '飛行科目', desc: '科目の追加・名称変更・有効/無効', icon: BookOpen, roles: ['admin', 'manager'] },
  { id: 'notices', label: 'お知らせ管理', desc: 'メンテナンス情報等の配信（admin）', icon: Megaphone, roles: ['admin'] },
  { id: 'role', label: '権限設定', desc: 'ユーザーの権限を管理（admin）', icon: Shield, roles: ['admin'] },
  { id: 'notify', label: '通知設定', desc: '通知方法・リマインダー', icon: Bell },
]

const roleLabel: Record<string, string> = { admin: 'admin', manager: '運航管理者', instructor: '教官', operator: 'ピスト', member: '学生' }

const KIND_LABEL = { info: 'お知らせ', maintenance: 'メンテナンス', warning: '注意' }


export default function SettingsPage() {
  // モバイルは「メニュー→詳細」の2段階、デスクトップは常時2ペイン
  const [section, setSection] = useState<SectionId | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [me, setMe] = useState<User | null>(null)
  const [saved, setSaved] = useState(false)
  const [org, setOrg] = useState<Organization | null>(null)
  const [orgForm, setOrgForm] = useState({ name: '', airports: '' })
  const [userForm, setUserForm] = useState({ name: '', pw1: '', pw2: '' })
  const [subjects, setSubjects] = useState<FlightSubject[]>([])
  const [newSubject, setNewSubject] = useState('')
  const loadSubjects = () => listAllSubjects().then(setSubjects).catch(() => {})
  useEffect(() => { loadSubjects() }, [])

  async function handleAddSubject() {
    const name = newSubject.trim()
    if (!name) return
    try {
      await upsertSubject({ id: '', name, display_order: (subjects[subjects.length - 1]?.display_order ?? 0) + 1, is_active: true })
      setNewSubject('')
      await loadSubjects()
      showSaved()
    } catch (err) {
      alert(err instanceof Error ? err.message : '科目の追加に失敗しました')
    }
  }

  async function handleSaveSubject(s: FlightSubject) {
    try {
      await upsertSubject(s)
      await loadSubjects()
      showSaved()
    } catch (err) {
      alert(err instanceof Error ? err.message : '科目の保存に失敗しました')
      await loadSubjects()
    }
  }

  const [notices, setNotices] = useState<Notice[]>([])
  const [noticeForm, setNoticeForm] = useState({ title: '', body: '', kind: 'info' as Notice['kind'] })
  const loadNotices = () => fetchNotices().then(setNotices).catch(() => {})
  useEffect(() => { loadNotices() }, [])
  async function handlePostNotice() {
    if (!noticeForm.title.trim()) return
    await createNotice(noticeForm)
    setNoticeForm({ title: '', body: '', kind: 'info' })
    loadNotices()
    showSaved()
  }
  async function handleDeleteNotice(id: string) {
    if (!confirm('このお知らせを削除しますか？')) return
    await deleteNotice(id)
    loadNotices()
  }
  const loadOrg = () => getOrganization().then(o => {
    setOrg(o)
    // 出発地・到着地は「よく使う離発着地」として統合管理（重複を除いた和集合で初期化）
    const airports = [...new Set([...o.default_departure_airports, ...o.default_arrival_airports])]
    setOrgForm({ name: o.name, airports: airports.join(', ') })
  }).catch(() => {})
  useEffect(() => { loadOrg() }, [])

  async function handleSaveOrg() {
    try {
      const airports = orgForm.airports.split(',').map(s => s.trim()).filter(Boolean)
      // 同じリストを出発地・到着地の両方に保存する
      await updateOrganization({
        name: orgForm.name.trim(),
        default_departure_airports: airports,
        default_arrival_airports: airports,
      })
      await loadOrg()
      showSaved()
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存に失敗しました')
    }
  }

  async function regenerateInvite() {
    if (!confirm('招待コードを再発行しますか？（古いコードは使えなくなります）')) return
    const code = Array.from({ length: 8 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('')
    try {
      await updateOrganization({ invite_code: code })
      await loadOrg()
      showSaved()
    } catch (err) {
      alert(err instanceof Error ? err.message : '再発行に失敗しました')
    }
  }

  async function handleSaveUser() {
    if (!me) return
    try {
      if (userForm.pw1 || userForm.pw2) {
        if (userForm.pw1 !== userForm.pw2) {
          alert('新しいパスワードが一致しません')
          return
        }
        if (userForm.pw1.length < 8) {
          alert('パスワードは8文字以上にしてください')
          return
        }
        await changePassword(userForm.pw1)
      }
      if (userForm.name.trim() && userForm.name.trim() !== me.name) {
        await updateUserProfile(me.id, { name: userForm.name.trim() })
        setMe({ ...me, name: userForm.name.trim() })
      }
      setUserForm(f => ({ ...f, pw1: '', pw2: '' }))
      showSaved()
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存に失敗しました')
    }
  }
  useEffect(() => {
    getSessionUserAsync().then(u => {
      setMe(u)
      if (u) setUserForm(f => ({ ...f, name: u.name }))
    })
    listUsers().then(setUsers).catch(() => {})
  }, [])

  const active = section ?? 'user'

  function showSaved() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const sectionBody = (
    <div className="space-y-4">
      {active === 'user' && (
        <Card className="p-5 space-y-4">
          <h2 className="font-bold text-sm">ユーザー設定</h2>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              {me?.name.charAt(0) ?? ''}
            </div>
            <div>
              <div className="font-medium text-sm">{me?.name}</div>
              <div className="text-xs text-slate-400">{me?.email} ・ {me ? roleLabel[me.role] : ''}</div>
            </div>
          </div>
          <Field label="名前"><TextInput value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} /></Field>
          <Field label="所属"><TextInput value={org?.name ?? ''} readOnly className="bg-slate-50 text-slate-500" /></Field>
          <Field label="テーマ">
            <Select defaultValue="light">
              <option value="light">ライト</option>
              <option value="dark">ダーク</option>
              <option value="system">システム設定に従う</option>
            </Select>
          </Field>
          <Field label="新しいパスワード"><TextInput type="password" value={userForm.pw1} onChange={e => setUserForm(f => ({ ...f, pw1: e.target.value }))} placeholder="8文字以上の英数字（変更する場合のみ）" /></Field>
          <Field label="新しいパスワード（確認）"><TextInput type="password" value={userForm.pw2} onChange={e => setUserForm(f => ({ ...f, pw2: e.target.value }))} placeholder="もう一度入力" /></Field>
          <Button onClick={handleSaveUser}>保存する</Button>
        </Card>
      )}

      {active === 'home' && (
        <Card className="p-5 space-y-3">
          <h2 className="font-bold text-sm">ホーム表示設定</h2>
          {['本日のフライト', 'クイックメニュー', '機体の状態', 'お知らせ', '最近のフライト記録'].map(item => (
            <label key={item} className="flex items-center justify-between py-1 text-sm">
              {item}
              <input type="checkbox" defaultChecked className="rounded w-4 h-4" />
            </label>
          ))}
          <Button onClick={showSaved}>保存する</Button>
        </Card>
      )}

      {active === 'org' && (
        <Card className="p-5 space-y-4">
          <h2 className="font-bold text-sm">団体設定</h2>
          {me?.role === 'admin' && (
            <Field label="団体名"><TextInput value={orgForm.name} onChange={e => setOrgForm(f => ({ ...f, name: e.target.value }))} /></Field>
          )}
          <Field label="よく使う離発着地（カンマ区切り）">
            <TextInput value={orgForm.airports} onChange={e => setOrgForm(f => ({ ...f, airports: e.target.value }))}
              placeholder="大利根飛行場, 妻沼滑空場, 板倉滑空場" />
            <p className="text-[11px] text-slate-400 mt-1">発航記録の出発地・到着地の両方の候補チップになります。</p>
          </Field>
          <Button onClick={handleSaveOrg}>保存する</Button>

          {/* 招待制度: 団体と個人の紐付け（adminのみ） */}
          {me?.role === 'admin' && (
          <div className="border-t border-slate-100 pt-4">
            <div className="text-sm font-bold mb-1">メンバー招待</div>
            <p className="text-xs text-slate-500 mb-3">
              招待コードを共有すると、新規登録時にコードを入力したユーザーがこの団体に紐付きます。
            </p>
            <div className="flex gap-2 items-center">
              <code className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono tracking-wider">{org?.invite_code ?? "…"}</code>
              <Button variant="secondary" size="sm" onClick={() => { if (org) { navigator.clipboard?.writeText(org.invite_code ?? ''); showSaved() } }}>コピー</Button>
              <Button variant="secondary" size="sm" onClick={regenerateInvite}>再発行</Button>
            </div>
            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-500 mb-1.5">所属メンバー（{users.length}名）</div>
              <div className="flex flex-wrap gap-1.5">
                {users.map(u => <Chip key={u.id} color="gray">{u.name}</Chip>)}
              </div>
            </div>
          </div>
          )}
        </Card>
      )}

      {active === 'subjects' && (
        <Card className="p-5 space-y-4">
          <div>
            <h2 className="font-bold text-sm">飛行科目</h2>
            <p className="text-xs text-slate-400 mt-0.5">発航記録の「飛行科目」の選択肢を管理します。無効にすると新規入力の選択肢から消えます（過去の記録には残ります）。</p>
          </div>
          <div className="flex gap-2">
            <TextInput value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="新しい科目名（例: 曲技飛行）" />
            <Button variant="secondary" size="sm" className="shrink-0" onClick={handleAddSubject} disabled={!newSubject.trim()}>
              <Plus className="w-4 h-4" />追加
            </Button>
          </div>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {subjects.map(s => (
              <div key={s.id} className="px-3.5 py-2.5 flex items-center gap-2.5">
                <TextInput
                  defaultValue={s.name}
                  onBlur={e => { const name = e.target.value.trim(); if (name && name !== s.name) handleSaveSubject({ ...s, name }) }}
                  className={`flex-1 !py-1.5 ${s.is_active ? '' : 'text-slate-400 line-through'}`}
                />
                <label className="flex items-center gap-1.5 text-xs text-slate-600 whitespace-nowrap">
                  <input type="checkbox" checked={s.is_active}
                    onChange={e => handleSaveSubject({ ...s, is_active: e.target.checked })} className="rounded" />
                  有効
                </label>
              </div>
            ))}
            {subjects.length === 0 && <p className="px-4 py-6 text-xs text-slate-400 text-center">科目がありません</p>}
          </div>
          <p className="text-[11px] text-slate-400">名称は入力欄からフォーカスを外すと保存されます。</p>
        </Card>
      )}

      {active === 'notices' && (
        <Card className="p-5 space-y-4">
          <div>
            <h2 className="font-bold text-sm">お知らせ管理</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              投稿するとホームとベルアイコンに配信されます。
              {isSupabaseConfigured()
                ? ' 配信先: Supabase（全ユーザーに即時反映）'
                : ' 現在はモック運用（この端末のみに保存。Supabase接続後は全ユーザーへ配信）'}
            </p>
          </div>

          {/* 投稿フォーム */}
          <div className="space-y-3 border border-slate-200 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="種別">
                <Select value={noticeForm.kind} onChange={e => setNoticeForm(p => ({ ...p, kind: e.target.value as Notice['kind'] }))}>
                  <option value="info">お知らせ</option>
                  <option value="maintenance">メンテナンス</option>
                  <option value="warning">注意</option>
                </Select>
              </Field>
              <Field label="タイトル">
                <TextInput value={noticeForm.title} onChange={e => setNoticeForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="例: 定期メンテナンスのお知らせ" />
              </Field>
            </div>
            <Field label="本文">
              <textarea value={noticeForm.body} onChange={e => setNoticeForm(p => ({ ...p, body: e.target.value }))}
                rows={3} className={inputCls} placeholder="例: 7/20 15:00〜22:00 システムメンテナンスを実施します。" />
            </Field>
            <Button onClick={handlePostNotice} disabled={!noticeForm.title.trim()}>配信する</Button>
          </div>

          {/* 配信済み一覧 */}
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-2">配信済み（{notices.length}件）</div>
            {notices.length === 0 ? (
              <p className="text-xs text-slate-400">お知らせはありません</p>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {notices.map(n => (
                  <div key={n.id} className="px-3.5 py-3 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Chip color={n.kind === 'maintenance' ? 'yellow' : n.kind === 'warning' ? 'red' : 'blue'}>
                          {(KIND_LABEL as Record<string, string>)[n.kind] ?? n.kind}
                        </Chip>
                        <span className="text-[11px] text-slate-400">{n.date}</span>
                      </div>
                      <div className="text-sm font-medium">{n.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{n.body}</div>
                    </div>
                    <button onClick={() => handleDeleteNotice(n.id)} className="p-1 text-slate-300 hover:text-red-500" title="削除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {active === 'role' && (
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-sm">権限設定</h2>
            <p className="text-xs text-slate-400 mt-0.5">adminのみ変更できます</p>
          </div>
          <div className="divide-y divide-slate-100">
            {users.map(u => (
              <div key={u.id} className="px-5 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-sm text-slate-600 shrink-0">
                  {u.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{u.name}</div>
                  <div className="text-xs text-slate-400 truncate">{u.email}</div>
                </div>
                <Select
                  value={u.role}
                  onChange={async e => {
                    const role = e.target.value as User['role']
                    const prev = users
                    setUsers(list => list.map(x => x.id === u.id ? { ...x, role } : x))
                    try {
                      await updateUserProfile(u.id, { role })
                      showSaved()
                    } catch (err) {
                      setUsers(prev)
                      alert(err instanceof Error ? err.message : '権限の変更に失敗しました')
                    }
                  }}
                  className="!w-28 !py-1.5 !text-xs"
                >
                  <option value="admin">admin</option>
                  <option value="manager">運航管理者</option>
                  <option value="instructor">教官</option>
                  <option value="operator">ピスト</option>
                  <option value="member">学生</option>
                </Select>
              </div>
            ))}
          </div>
        </Card>
      )}

      {active === 'notify' && (
        <Card className="p-5 space-y-3">
          <h2 className="font-bold text-sm">通知設定</h2>
          {[
            ['通知を受け取る', true],
            ['承認待ちフライトの通知', true],
            ['未入力（着陸未記録）のリマインダー', true],
            ['お知らせの通知', false],
          ].map(([label, on]) => (
            <label key={String(label)} className="flex items-center justify-between py-1 text-sm">
              {label}
              <input type="checkbox" defaultChecked={Boolean(on)} className="rounded w-4 h-4" />
            </label>
          ))}
          <Field label="通知方法">
            <Select defaultValue="push">
              <option value="push">プッシュ通知</option>
              <option value="mail">メール</option>
              <option value="both">両方</option>
            </Select>
          </Field>
          <Button onClick={showSaved}>保存する</Button>
        </Card>
      )}

    </div>
  )

  return (
    <AppShell>
      <Page className="max-w-5xl">
        <PageTitle action={saved ? <Chip color="green">保存しました</Chip> : undefined}>設定</PageTitle>

        <div className="md:grid md:grid-cols-3 md:gap-4 md:items-start">
          {/* メニュー（モバイル: 一覧、デスクトップ: 左ペイン） */}
          <Card className={`overflow-hidden md:block ${section ? 'hidden' : ''}`}>
            <div className="divide-y divide-slate-100">
              {sections.filter(sec => !sec.roles || (me && sec.roles.includes(me.role))).map(sec => (
                <button
                  key={sec.id}
                  onClick={() => setSection(sec.id)}
                  className={`w-full px-4 py-3.5 flex items-center gap-3 text-left transition ${
                    active === sec.id ? 'md:bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    active === sec.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <sec.icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{sec.label}</div>
                    <div className="text-[11px] text-slate-400 truncate">{sec.desc}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </button>
              ))}
            </div>
          </Card>

          {/* 詳細（モバイル: sectionが選ばれた時のみ） */}
          <div className={`md:col-span-2 ${section ? '' : 'hidden md:block'}`}>
            {section && (
              <button onClick={() => setSection(null)} className="md:hidden flex items-center gap-1 text-sm text-blue-600 mb-3">
                <ChevronLeft className="w-4 h-4" />設定メニューへ戻る
              </button>
            )}
            {sectionBody}
          </div>
        </div>
      </Page>
    </AppShell>
  )
}
