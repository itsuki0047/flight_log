import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMinutes(minutes: number | undefined | null): string {
  if (minutes == null) return '--:--'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formatTime(iso: string | undefined | null): string {
  // 日付のみ(時刻未入力)の場合は '--:--' を返す
  if (!iso || !iso.includes('T')) return '--:--'
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

export function formatDateShort(iso: string | undefined | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

export function calcFlightTime(dep: string, arr: string): number {
  const d = new Date(dep)
  const a = new Date(arr)
  return Math.round((a.getTime() - d.getTime()) / 60000)
}

export function flightStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: '下書き',
    launched: '飛行中',
    landed: '着陸済',
    pending_approval: '承認待ち',
    approved: '承認済',
    revision_requested: '修正依頼',
  }
  return map[status] ?? status
}

export function flightStatusColor(status: string): string {
  const map: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    launched: 'bg-blue-100 text-blue-700',
    landed: 'bg-green-100 text-green-700',
    pending_approval: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-emerald-100 text-emerald-700',
    revision_requested: 'bg-red-100 text-red-700',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

export function aircraftStatusLabel(status: string): string {
  const map: Record<string, string> = {
    active: '使用中',
    maintenance: '整備中',
    grounded: '飛行停止',
    retired: '退役',
  }
  return map[status] ?? status
}

export function aircraftStatusColor(status: string): string {
  const map: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    maintenance: 'bg-yellow-100 text-yellow-700',
    grounded: 'bg-red-100 text-red-700',
    retired: 'bg-gray-100 text-gray-500',
  }
  return map[status] ?? 'bg-gray-100 text-gray-600'
}

export function categoryLabel(cat: string): string {
  const map: Record<string, string> = { glider: '滑空機', airplane: '固定翼', helicopter: '回転翼' }
  return map[cat] ?? cat
}
