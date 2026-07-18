// 個人ログの初期値（アプリ導入前の紙の記録簿の総合計）。
// Supabase導入までは localStorage に保持する。
export interface TimeCount {
  min: number
  cnt: number
}

export interface InitialTotals {
  ft: TimeCount        // 飛行時間
  sw: TimeCount        // 単独/機長 × ウインチ
  sa: TimeCount        // 単独/機長 × 航空機曳航
  dw: TimeCount        // 同乗教育 × ウインチ
  da: TimeCount        // 同乗教育 × 航空機曳航
  xc: TimeCount        // 野外飛行
  inst: TimeCount      // 操縦教員としての時間
  landings: number     // 着陸回数
}

export const INITIAL_ITEMS: { key: keyof Omit<InitialTotals, 'landings'>; label: string }[] = [
  { key: 'ft', label: '飛行時間 合計' },
  { key: 'sw', label: '単独/機長 × ウインチ曳航' },
  { key: 'sa', label: '単独/機長 × 航空機曳航' },
  { key: 'dw', label: '同乗教育 × ウインチ曳航' },
  { key: 'da', label: '同乗教育 × 航空機曳航' },
  { key: 'xc', label: '野外飛行' },
  { key: 'inst', label: '操縦教員としての時間' },
]

export function emptyInitials(): InitialTotals {
  const z = () => ({ min: 0, cnt: 0 })
  return { ft: z(), sw: z(), sa: z(), dw: z(), da: z(), xc: z(), inst: z(), landings: 0 }
}

// 記録簿設定: 紙の記録簿からの移行情報一式。ユーザーごとに保存し、
// ページ割り（通算ページ番号・締めによる途中改ページ）を常に同じ結果で再現できるようにする。
export interface LogbookSettings {
  initials: InitialTotals
  startPage: number   // アプリ最初の記録が載る通算ページ番号（紙の続き）
  startRow: number    // そのページの開始行 (1〜12)
  cutoffs: string[]   // 締め日（この日の記録でページを閉じる）昇順で保持
}

export function emptySettings(): LogbookSettings {
  return { initials: emptyInitials(), startPage: 1, startRow: 1, cutoffs: [] }
}

const legacyKey = (userId: string) => `flightlog_initials_${userId}`
const settingsKey = (userId: string) => `flightlog_logbook_settings_${userId}`

export function getLogbookSettings(userId: string): LogbookSettings {
  if (typeof window === 'undefined') return emptySettings()
  try {
    const raw = localStorage.getItem(settingsKey(userId))
    if (raw) {
      const v = JSON.parse(raw)
      return {
        ...emptySettings(),
        ...v,
        initials: { ...emptyInitials(), ...(v.initials ?? {}) },
        cutoffs: Array.isArray(v.cutoffs) ? [...v.cutoffs].sort() : [],
      }
    }
    // 旧形式（初期値のみ）からの移行
    const legacy = localStorage.getItem(legacyKey(userId))
    if (legacy) {
      return { ...emptySettings(), initials: { ...emptyInitials(), ...JSON.parse(legacy) } }
    }
    return emptySettings()
  } catch {
    return emptySettings()
  }
}

export function saveLogbookSettings(userId: string, v: LogbookSettings) {
  localStorage.setItem(settingsKey(userId), JSON.stringify({ ...v, cutoffs: [...v.cutoffs].sort() }))
}

export function getInitials(userId: string): InitialTotals {
  return getLogbookSettings(userId).initials
}

export function hasInitials(v: InitialTotals): boolean {
  return v.landings > 0 || INITIAL_ITEMS.some(i => v[i.key].min > 0 || v[i.key].cnt > 0)
}

// "HH:MM" or "MM" → 分
export function parseHm(s: string): number {
  if (!s) return 0
  if (s.includes(':')) {
    const [h, m] = s.split(':').map(n => parseInt(n, 10) || 0)
    return h * 60 + m
  }
  return parseInt(s, 10) || 0
}

export function toHm(min: number): string {
  if (!min) return ''
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`
}
