'use client'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useEffect } from 'react'

/* ---------- Card ---------- */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('bg-white rounded-2xl border border-slate-200 shadow-sm', className)}>
      {children}
    </div>
  )
}

export function CardHeader({
  icon: Icon,
  title,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('px-4 py-3 border-b border-slate-100 flex items-center gap-2', className)}>
      {Icon && <Icon className="w-4 h-4 text-blue-600" />}
      <span className="font-semibold text-sm">{title}</span>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}

/* ---------- Chip ---------- */
const chipColors: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-emerald-50 text-emerald-700',
  yellow: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-600',
  gray: 'bg-slate-100 text-slate-600',
  violet: 'bg-violet-50 text-violet-700',
  orange: 'bg-orange-50 text-orange-700',
}
export function Chip({ color = 'gray', children, className }: { color?: keyof typeof chipColors; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap', chipColors[color], className)}>
      {children}
    </span>
  )
}

export function statusChipColor(status: string): keyof typeof chipColors {
  const map: Record<string, keyof typeof chipColors> = {
    draft: 'gray', launched: 'blue', landed: 'green',
    pending_approval: 'yellow', approved: 'violet', revision_requested: 'red',
    active: 'green', maintenance: 'yellow', grounded: 'red', retired: 'gray',
  }
  return map[status] ?? 'gray'
}

/* ---------- Button ---------- */
const btnVariants = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
  ghost: 'text-blue-600 hover:bg-blue-50',
  danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
}
export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof btnVariants
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-medium rounded-xl transition disabled:opacity-50 disabled:pointer-events-none',
        size === 'sm' ? 'text-xs px-3 py-1.5' : size === 'lg' ? 'text-sm px-6 py-3 w-full' : 'text-sm px-4 py-2',
        btnVariants[variant],
        className,
      )}
      {...props}
    />
  )
}

/* ---------- Form fields ---------- */
export function Field({ label, required, children, className }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="text-xs font-medium text-slate-500 mb-1 block">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  )
}

export const inputCls =
  'w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500'

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputCls, props.className)} />
}

/* ---------- Quick-pick chips（よく使う候補） ---------- */
export function QuickPicks({ options, onPick, className }: { options: string[]; onPick: (v: string) => void; className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-1.5 mt-1.5', className)}>
      {options.map(o => (
        <button
          key={o}
          type="button"
          onClick={() => onPick(o)}
          className="text-[11px] px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
        >
          {o}
        </button>
      ))}
    </div>
  )
}

/* ---------- Stat card ---------- */
export function StatCard({ label, value, unit, accent = 'text-blue-600' }: { label: string; value: React.ReactNode; unit?: string; accent?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={cn('text-2xl font-bold tabular-nums', accent)}>
        {value}
        {unit && <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>}
      </div>
    </Card>
  )
}

/* ---------- Modal（モバイルはボトムシート、デスクトップは中央） ---------- */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div
        className={cn(
          'relative bg-white w-full sm:mx-4 rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92dvh] sm:max-h-[85dvh] flex flex-col',
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg',
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <h2 className="font-bold text-base">{title}</h2>
          <button onClick={onClose} aria-label="閉じる" className="p-1 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  )
}

/* ---------- Empty state ---------- */
export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-4 py-10 text-sm text-slate-400 text-center">{children}</p>
}

/* ---------- Page container ---------- */
export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-4 sm:p-6 max-w-6xl mx-auto pb-24 md:pb-8', className)}>{children}</div>
}

export function PageTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4 sm:mb-6">
      <h1 className="text-xl sm:text-2xl font-bold">{children}</h1>
      {action}
    </div>
  )
}
