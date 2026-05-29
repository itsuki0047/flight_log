'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, PlaneTakeoff, List, User, BookOpen, Settings, Plane, FileOutput } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/home', label: 'ホーム', icon: Home },
  { href: '/flights', label: '発航記録', icon: PlaneTakeoff },
  { href: '/logs', label: '全体ログ', icon: List },
  { href: '/personal-log', label: '個人ログ', icon: User },
  { href: '/aircraft-log', label: '航空日誌', icon: BookOpen },
  { href: '/aircraft', label: '機体管理', icon: Plane },
  { href: '/pdf', label: 'PDF出力', icon: FileOutput },
  { href: '/settings', label: '設定', icon: Settings },
]

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  return (
    <div className="w-56 h-full bg-slate-900 text-white flex flex-col">
      <div className="px-4 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <PlaneTakeoff className="w-5 h-5 text-sky-400" />
          <span className="font-bold text-sm leading-tight">Flight Log<br />Manager</span>
        </div>
      </div>
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                active
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="px-4 py-3 border-t border-slate-700 text-xs text-slate-500">
        大学航空部
      </div>
    </div>
  )
}
