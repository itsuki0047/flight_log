'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home, PlaneTakeoff, List, User, BookOpen, Settings, Plane, FileOutput,
  Bell, Menu, LogOut, CheckSquare, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getSessionUserAsync, logout } from '@/lib/session'
import { fetchNotices, subscribeNotices, type Notice } from '@/lib/notices'
import type { User as UserType } from '@/lib/types'

export const NAV = [
  { href: '/home', label: 'ホーム', icon: Home },
  { href: '/flights', label: '発航記録', icon: PlaneTakeoff },
  { href: '/logs', label: '全体ログ', icon: List },
  { href: '/personal-log', label: '個人ログ', icon: User },
  { href: '/aircraft-log', label: '航空日誌', icon: BookOpen },
  { href: '/approval', label: '教官承認', icon: CheckSquare },
  { href: '/aircraft', label: '機体管理', icon: Plane },
  { href: '/pdf', label: 'PDF出力', icon: FileOutput },
  { href: '/settings', label: '設定', icon: Settings },
]

// モバイル下タブ: 主要4画面+メニュー
const MOBILE_TABS = [
  { href: '/home', label: 'ホーム', icon: Home },
  { href: '/flights', label: '発航記録', icon: PlaneTakeoff },
  { href: '/logs', label: '全体ログ', icon: List },
  { href: '/personal-log', label: '個人ログ', icon: User },
]

const roleLabel: Record<string, string> = { admin: 'admin', manager: '運航管理者', instructor: '教官', operator: 'ピスト', member: '学生' }

function pageTitle(pathname: string) {
  const item = NAV.find(n => pathname === n.href || pathname.startsWith(n.href + '/'))
  return item?.label ?? 'Flight Log'
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<UserType | null>(null)
  const [checked, setChecked] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [notices, setNotices] = useState<Notice[]>([])
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    const load = () => fetchNotices().then(n => { if (alive) setNotices(n) }).catch(() => {})
    load()
    const unsubscribe = subscribeNotices(load)
    return () => { alive = false; unsubscribe() }
  }, [])

  useEffect(() => {
    getSessionUserAsync().then(u => {
      if (!u) {
        router.replace('/login')
        return
      }
      setUser(u)
      setChecked(true)
    })
  }, [router])

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
    }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [])

  useEffect(() => setMenuOpen(false), [pathname])

  if (!checked) return <div className="min-h-dvh bg-slate-100" />

  const handleLogout = () => {
    logout()
    router.replace('/login')
  }

  return (
    <div className="min-h-dvh bg-slate-100 flex">
      {/* デスクトップ: サイドバー */}
      <aside className="hidden md:flex w-60 shrink-0 sticky top-0 h-dvh flex-col bg-white border-r border-slate-200 print:hidden">
        <div className="px-5 py-5 flex items-center gap-2.5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <PlaneTakeoff className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm leading-tight">フライトログ</div>
            <div className="text-[10px] text-slate-400">運航記録管理</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                  active ? 'bg-blue-600 text-white font-medium shadow-sm' : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            )
          })}
        </nav>
        {user && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{user.name}</div>
              <div className="text-[11px] text-slate-400">{roleLabel[user.role]}</div>
            </div>
            <button onClick={handleLogout} title="ログアウト" className="text-slate-400 hover:text-red-500 p-1">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* ヘッダー */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-3 px-4 sm:px-6 h-14">
            <button className="md:hidden p-1 -ml-1 text-slate-600" aria-label="メニュー" onClick={() => setMenuOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="font-bold text-base md:text-lg">{pageTitle(pathname)}</h1>
            <div className="ml-auto flex items-center gap-2">
              {/* お知らせ */}
              <div className="relative" ref={bellRef}>
                <button
                  onClick={() => setBellOpen(o => !o)}
                  aria-label="お知らせ"
                  className="p-2 text-slate-500 hover:text-blue-600 relative"
                >
                  <Bell className="w-5 h-5" />
                  {notices.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
                  )}
                </button>
                {bellOpen && (
                  <div className="absolute right-0 mt-1 w-80 max-w-[85vw] bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-slate-100 font-semibold text-sm">お知らせ</div>
                    <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                      {notices.length === 0 && (
                        <p className="px-4 py-6 text-xs text-slate-400 text-center">お知らせはありません</p>
                      )}
                      {notices.map(n => (
                        <div key={n.id} className="px-4 py-3">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded font-medium',
                              n.kind === 'maintenance' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700',
                            )}>
                              {n.kind === 'maintenance' ? 'メンテ' : 'お知らせ'}
                            </span>
                            <span className="text-[11px] text-slate-400">{n.date}</span>
                          </div>
                          <div className="text-sm font-medium">{n.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{n.body}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* モバイル: ユーザーアイコン */}
              {user && (
                <div className="md:hidden w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0">{children}</main>

        {/* モバイル: 下タブ */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 print:hidden pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-5">
            {MOBILE_TABS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link key={href} href={href} className="flex flex-col items-center gap-0.5 py-2">
                  <Icon className={cn('w-5 h-5', active ? 'text-blue-600' : 'text-slate-400')} />
                  <span className={cn('text-[10px]', active ? 'text-blue-600 font-semibold' : 'text-slate-400')}>{label}</span>
                </Link>
              )
            })}
            <button onClick={() => setMenuOpen(true)} className="flex flex-col items-center gap-0.5 py-2">
              <Menu className="w-5 h-5 text-slate-400" />
              <span className="text-[10px] text-slate-400">メニュー</span>
            </button>
          </div>
        </nav>

        {/* モバイル: メニューシート */}
        {menuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMenuOpen(false)} />
            <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="font-bold">メニュー</span>
                <button onClick={() => setMenuOpen(false)} aria-label="閉じる" className="p-1 text-slate-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {NAV.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex flex-col items-center gap-1.5 py-3.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-700"
                  >
                    <Icon className="w-5 h-5 text-blue-600" />
                    <span className="text-xs">{label}</span>
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="flex flex-col items-center gap-1.5 py-3.5 rounded-xl bg-slate-50 hover:bg-red-50 text-slate-700"
                >
                  <LogOut className="w-5 h-5 text-red-500" />
                  <span className="text-xs">ログアウト</span>
                </button>
              </div>
              {user && (
                <div className="mt-3 px-2 py-2.5 rounded-xl bg-slate-50 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{user.name}</div>
                    <div className="text-[11px] text-slate-400">{roleLabel[user.role]} / {user.email}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
