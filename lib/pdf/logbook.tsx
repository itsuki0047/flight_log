'use client'
/* eslint-disable jsx-a11y/alt-text */
// 紙の航空日誌（グライダー飛行記録簿）レイアウトのPDF生成。
// @react-pdf/renderer によりクライアントサイドで生成するため、
// 静的エクスポート(GitHub Pages)でも動作する。
import React from 'react'
import { Document, Page, Text, View, Font, pdf, StyleSheet } from '@react-pdf/renderer'
import type { PersonalLogEntry, AircraftLogEntry } from '@/lib/types'
import type { InitialTotals } from '@/lib/initials'

const ROWS_PER_PAGE = 12

/* ---------- フォント ---------- */
// GitHub Pages では /flight_log 配下で配信されるため basePath を吸収する
function assetPrefix() {
  if (typeof window === 'undefined') return ''
  return window.location.pathname.startsWith('/flight_log') ? '/flight_log' : ''
}

let fontReady = false
function ensureFonts() {
  if (fontReady) return
  const p = assetPrefix()
  Font.register({
    family: 'ZenKaku',
    fonts: [
      { src: `${p}/fonts/ZenKakuGothicNew-Regular.ttf`, fontWeight: 'normal' },
      { src: `${p}/fonts/ZenKakuGothicNew-Bold.ttf`, fontWeight: 'bold' },
    ],
  })
  // 日本語はハイフネーション不可: 文字単位で折り返す
  Font.registerHyphenationCallback(word => (word.length === 1 ? [word] : Array.from(word)))
  fontReady = true
}

/* ---------- 共通ユーティリティ ---------- */
const hhmm = (min?: number) => {
  if (!min || min <= 0) return ''
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`
}
const tm = (iso?: string) => {
  if (!iso) return ''
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const cnt = (n: number) => (n > 0 ? `${n}回` : '回')

const isWinch = (e: PersonalLogEntry) => {
  const n = e.launch_method_name ?? ''
  return n.includes('ウインチ') || n.includes('ウィンチ') || n.includes('自動車')
}
const isDual = (e: PersonalLogEntry) => (e.dual_instruction_time ?? 0) > 0

interface Totals {
  ft: number; ftC: number
  sw: number; swC: number; sa: number; saC: number
  dw: number; dwC: number; da: number; daC: number
  xc: number; xcC: number; inst: number; instC: number; other: number
  landings: number
}
function calc(entries: PersonalLogEntry[]): Totals {
  const o: Totals = { ft: 0, ftC: 0, sw: 0, swC: 0, sa: 0, saC: 0, dw: 0, dwC: 0, da: 0, daC: 0, xc: 0, xcC: 0, inst: 0, instC: 0, other: 0, landings: 0 }
  for (const e of entries) {
    const t = e.total_flight_time
    o.ft += t; o.ftC++
    o.landings += e.landing_count
    if (isDual(e)) {
      if (isWinch(e)) { o.dw += t; o.dwC++ } else { o.da += t; o.daC++ }
    } else {
      if (isWinch(e)) { o.sw += t; o.swC++ } else { o.sa += t; o.saC++ }
    }
    if (e.cross_country_pic_solo_picus_time) { o.xc += e.cross_country_pic_solo_picus_time; o.xcC++ }
    if (e.instruction_time) { o.inst += e.instruction_time; o.instC++ }
    o.other += e.other_flight_time ?? 0
  }
  return o
}

/* ---------- 列幅定義 (pt) ---------- */
const W = {
  mon: 20, day: 20, type: 44, reg: 44, dep: 36, arr: 36, depT: 27, arrT: 27, land: 24,
  ft: 30, sw: 30, sa: 30, dw: 30, da: 30, rel: 25, max: 25,
  mgLandG: 18, mgLandM: 18, mgFt: 30, mgSm: 27, mgSg: 27, mgDm: 27, mgDg: 27,
  xc: 29, inst: 29, other: 29,
}
const DATE_W = W.mon + W.day
const GLIDER_W = W.type + W.reg
const LOC_W = W.dep + W.arr
const TIME_W = W.depT + W.arrT
const GTIME_W = W.ft + W.sw + W.sa + W.dw + W.da
const ALT_W = W.rel + W.max
const MG_W = W.mgLandG + W.mgLandM + W.mgFt + W.mgSm + W.mgSg + W.mgDm + W.mgDg

const s = StyleSheet.create({
  page: { fontFamily: 'ZenKaku', fontSize: 6, padding: 24, color: '#000' },
  table: { borderWidth: 1, borderColor: '#000' },
  row: { flexDirection: 'row' },
})

const bR = { borderRightWidth: 0.5, borderRightColor: '#000' } as const
const bB = { borderBottomWidth: 0.5, borderBottomColor: '#000' } as const

function C({ w, h, label, size = 5.5, bold, last, noBottom, align = 'center', children }: {
  w?: number; h?: number; label?: string; size?: number; bold?: boolean; last?: boolean; noBottom?: boolean
  align?: 'center' | 'left' | 'right'
  children?: React.ReactNode
}) {
  return (
    <View
      style={{
        ...(w != null ? { width: w } : { flex: 1 }),
        ...(h != null ? { height: h } : {}),
        ...(last ? {} : bR),
        ...(noBottom ? {} : bB),
        justifyContent: 'center',
        alignItems: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
        paddingHorizontal: 1,
      }}
    >
      {label != null
        ? <Text style={{ fontSize: size, fontWeight: bold ? 'bold' : 'normal', textAlign: align }}>{label}</Text>
        : children}
    </View>
  )
}

/* ---------- ヘッダー（3段） ---------- */
const H1 = 13, H2 = 13, H3 = 18
const HEAD_H = H1 + H2 + H3

function LogbookHeader() {
  return (
    <View style={[s.row, { height: HEAD_H }]}>
      {/* (1) DATE */}
      <View style={{ width: DATE_W }}>
        <C h={H1 + H2} label={'(1) DATE\n年月日'} />
        <View style={s.row}>
          <C w={W.mon} h={H3} label="月" noBottom={false} />
          <C w={W.day} h={H3} label="日" />
        </View>
      </View>
      {/* (2)(3) GLIDER */}
      <View style={{ width: GLIDER_W }}>
        <C h={H1} label="(2)(3) GLIDER 滑空機" />
        <View style={s.row}>
          <C w={W.type} h={H2 + H3} label={'TYPE\n型式'} />
          <C w={W.reg} h={H2 + H3} label={'REG.NO\n登録記号'} />
        </View>
      </View>
      {/* (4) LOCATION */}
      <View style={{ width: LOC_W }}>
        <C h={H1} label="(4) LOCATION" />
        <View style={s.row}>
          <C w={W.dep} h={H2 + H3} label={'TAKE OFF\n離陸地'} />
          <C w={W.arr} h={H2 + H3} label={'LANDING\n着陸地'} />
        </View>
      </View>
      {/* (5) TIME */}
      <View style={{ width: TIME_W }}>
        <C h={H1} label="(5) TIME 時刻" />
        <View style={s.row}>
          <C w={W.depT} h={H2 + H3} label={'離陸'} />
          <C w={W.arrT} h={H2 + H3} label={'着陸'} />
        </View>
      </View>
      {/* (6) NO OF LANDING */}
      <C w={W.land} h={HEAD_H} label={'(6)\nNO.OF\nLAND\n着陸\n回数'} size={4.5} />
      {/* (7) GLIDER times */}
      <View style={{ width: GTIME_W }}>
        <C h={H1} label="(7) GLIDER 滑空機" />
        <View style={s.row}>
          <C w={W.ft} h={H2 + H3} label={'FLIGHT\nTIME\n飛行時間'} size={4.5} />
          <View style={{ width: W.sw + W.sa }}>
            <C h={H2} label={'SOLO OR P.I.C\n単独又は機長'} size={4.5} />
            <View style={s.row}>
              <C w={W.sw} h={H3 - H2 + H2} label={'WINCH\nウインチ'} size={4.5} />
              <C w={W.sa} h={H3 - H2 + H2} label={'AERO TOW\n航空機曳航'} size={4.5} />
            </View>
          </View>
          <View style={{ width: W.dw + W.da }}>
            <C h={H2} label={'DUAL\n同乗教育'} size={4.5} />
            <View style={s.row}>
              <C w={W.dw} h={H3 - H2 + H2} label={'WINCH\nウインチ'} size={4.5} />
              <C w={W.da} h={H3 - H2 + H2} label={'AERO TOW\n航空機曳航'} size={4.5} />
            </View>
          </View>
        </View>
      </View>
      {/* ALTITUDE */}
      <View style={{ width: ALT_W }}>
        <C h={H1} label={'ALTITUDE 高度'} size={4.5} />
        <View style={s.row}>
          <C w={W.rel} h={H2 + H3} label={'RELEASE\n離脱'} size={4.5} />
          <C w={W.max} h={H2 + H3} label={'MAX.\n最高'} size={4.5} />
        </View>
      </View>
      {/* (8) MOTOR GLIDER */}
      <View style={{ width: MG_W }}>
        <C h={H1} label="(8) MOTOR GLIDER 動力滑空機" />
        <View style={s.row}>
          <View style={{ width: W.mgLandG + W.mgLandM }}>
            <C h={H2} label={'着陸回数'} size={4.5} />
            <View style={s.row}>
              <C w={W.mgLandG} h={H3} label={'滑空'} size={4.5} />
              <C w={W.mgLandM} h={H3} label={'動力'} size={4.5} />
            </View>
          </View>
          <C w={W.mgFt} h={H2 + H3} label={'FLIGHT\nTIME\n飛行時間'} size={4.5} />
          <View style={{ width: W.mgSm + W.mgSg }}>
            <C h={H2} label={'SOLO OR P.I.C\n単独又は機長'} size={4} />
            <View style={s.row}>
              <C w={W.mgSm} h={H3} label={'動力'} size={4.5} />
              <C w={W.mgSg} h={H3} label={'滑空'} size={4.5} />
            </View>
          </View>
          <View style={{ width: W.mgDm + W.mgDg }}>
            <C h={H2} label={'DUAL\n同乗教育'} size={4.5} />
            <View style={s.row}>
              <C w={W.mgDm} h={H3} label={'動力'} size={4.5} />
              <C w={W.mgDg} h={H3} label={'滑空'} size={4.5} />
            </View>
          </View>
        </View>
      </View>
      {/* (9)(10) その他 */}
      <C w={W.xc} h={HEAD_H} label={'(9)\nCROSS\nCOUNTRY\n野外飛行'} size={4.5} />
      <C w={W.inst} h={HEAD_H} label={'(10)\n操縦教員\nとしての\n時間'} size={4.5} />
      <C w={W.other} h={HEAD_H} label={'その他の\n飛行時間'} size={4.5} />
      <C h={HEAD_H} label={'(11) REMARKS\n補足事項\n練習科目 その他'} size={4.5} last />
    </View>
  )
}

/* ---------- 記入行 ---------- */
const ROW_H = 19

function LogbookRow({ e }: { e?: PersonalLogEntry }) {
  const d = e ? new Date(e.date) : null
  const solo = e ? !isDual(e) : false
  const winch = e ? isWinch(e) : false
  const t = e?.total_flight_time
  return (
    <View style={[s.row, { height: ROW_H }]}>
      <C w={W.mon} label={d ? String(d.getMonth() + 1) : ''} size={6} />
      <C w={W.day} label={d ? String(d.getDate()) : ''} size={6} />
      <C w={W.type} label={e?.aircraft_type ?? ''} size={6} />
      <C w={W.reg} label={e?.registration_number ?? ''} size={6} />
      <C w={W.dep} label={e?.departure_place ?? ''} size={5.5} />
      <C w={W.arr} label={e?.arrival_place ?? ''} size={5.5} />
      <C w={W.depT} label={e ? tm(e.departure_time) : ''} size={6} />
      <C w={W.arrT} label={e?.arrival_time ? tm(e.arrival_time) : ''} size={6} />
      <C w={W.land} label={e?.landing_count ? String(e.landing_count) : ''} size={6} />
      <C w={W.ft} label={hhmm(t)} size={6} />
      <C w={W.sw} label={e && solo && winch ? hhmm(t) : ''} size={6} />
      <C w={W.sa} label={e && solo && !winch ? hhmm(t) : ''} size={6} />
      <C w={W.dw} label={e && !solo && winch ? hhmm(t) : ''} size={6} />
      <C w={W.da} label={e && !solo && !winch ? hhmm(t) : ''} size={6} />
      <C w={W.rel} label={e?.flight?.release_altitude ? String(e.flight.release_altitude) : ''} size={6} />
      <C w={W.max} label={e?.flight?.max_altitude ? String(e.flight.max_altitude) : ''} size={6} />
      <C w={W.mgLandG} label="" />
      <C w={W.mgLandM} label="" />
      <C w={W.mgFt} label="" />
      <C w={W.mgSm} label="" />
      <C w={W.mgSg} label="" />
      <C w={W.mgDm} label="" />
      <C w={W.mgDg} label="" />
      <C w={W.xc} label={hhmm(e?.cross_country_pic_solo_picus_time)} size={6} />
      <C w={W.inst} label={hhmm(e?.instruction_time)} size={6} />
      <C w={W.other} label={hhmm(e?.other_flight_time)} size={6} />
      <C label={e?.flight_content ?? ''} size={5.5} align="left" last />
    </View>
  )
}

/* ---------- 合計ブロック ---------- */
const TOT_H = 15
const CERT_W = DATE_W + GLIDER_W + LOC_W

function totalsCells(o: Totals, kind: 'time' | 'count') {
  const v = kind === 'time'
    ? [hhmm(o.ft), hhmm(o.sw), hhmm(o.sa), hhmm(o.dw), hhmm(o.da), '', '', '', '', '', '', '', '', '', hhmm(o.xc), hhmm(o.inst), hhmm(o.other)]
    : [cnt(o.ftC), cnt(o.swC), cnt(o.saC), cnt(o.dwC), cnt(o.daC), '', '', cnt(0), cnt(0), '', cnt(0), cnt(0), cnt(0), cnt(0), cnt(o.xcC), cnt(o.instC), '']
  const ws = [W.ft, W.sw, W.sa, W.dw, W.da, W.rel, W.max, W.mgLandG, W.mgLandM, W.mgFt, W.mgSm, W.mgSg, W.mgDm, W.mgDg, W.xc, W.inst, W.other]
  return v.map((x, i) => <C key={i} w={ws[i]} label={x} size={5} />)
}

function ymdLabel(date?: string) {
  if (!date) return '    年  月  日'
  const d = new Date(date)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

function LogbookTotals({ page, fwd, total, pilotName, first, last }: {
  page: Totals; fwd: Totals; total: Totals; pilotName: string; first?: string; last?: string
}) {
  const sections: [string, Totals][] = [['PAGE TOTAL\n頁小計', page], ['AMT.FORWARD\n前頁までの合計', fwd], ['TOTAL\n総合計', total]]
  return (
    <View style={s.row}>
      {/* 証明欄 */}
      <View style={{ width: CERT_W, ...bR, padding: 4, justifyContent: 'space-between' }}>
        <Text style={{ fontSize: 5.5 }}>
          (14)  {ymdLabel(first)} 〜 {ymdLabel(last)}
        </Text>
        <Text style={{ fontSize: 5 }}>I CERTIFY THAT THE STATEMENTS MADE BY ME ON THIS FORM ARE TRUE.</Text>
        <Text style={{ fontSize: 5.5 }}>記載のとおり相違ありません</Text>
        <Text style={{ fontSize: 6, marginTop: 3 }}>
          PILOT&apos;S NAME 氏名  <Text style={{ textDecoration: 'underline' }}>  {pilotName}  </Text>
        </Text>
      </View>
      {/* 3セクション × (時間/回数) */}
      <View style={{ flex: 1 }}>
        {sections.map(([label, o], si) => (
          <View key={si}>
            <View style={[s.row, { height: TOT_H }]}>
              <C w={TIME_W} h={TOT_H * 2} label={label} size={4.5} bold={si === 2} noBottom={si === 2} />
              <C w={W.land} label={'TIME\n時間'} size={4.5} />
              {totalsCells(o, 'time')}
              <C label={si === 0 ? 'NOTES 備考' : ''} size={4.5} align="left" last noBottom={si === 2 ? false : undefined} />
            </View>
            <View style={[s.row, { height: TOT_H }]}>
              <View style={{ width: TIME_W }} />
              <C w={W.land} label={'NO.\n回数'} size={4.5} noBottom={si === 2} />
              {totalsCells(o, 'count')}
              <C label="" last />
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

/* ---------- 個人ログブック Document ---------- */
export interface LogbookOptions {
  // アプリ導入前の合計（最初のページの「前頁までの合計」になる）
  initial?: InitialTotals
  // 紙の記録簿の続きから始める場合の開始行 (1〜12)。手前の行は空欄で出力する
  startRow?: number
  // この日付で改ページする（書類提出の締め）。中途半端な行でもページを閉じる
  cutoffDates?: string[]
  // アプリ最初のページの通算ページ番号（紙の続き。例: 45）
  startPage?: number
  // 出力する通算ページ番号の範囲 [from, to]。省略時は全ページ。
  // 繰越合計は範囲外のページも含めて計算するので、どの範囲を出しても数値は一致する
  pageRange?: [number, number]
}

function zeroTotals(): Totals {
  return { ft: 0, ftC: 0, sw: 0, swC: 0, sa: 0, saC: 0, dw: 0, dwC: 0, da: 0, daC: 0, xc: 0, xcC: 0, inst: 0, instC: 0, other: 0, landings: 0 }
}

function initialToTotals(v?: InitialTotals): Totals {
  if (!v) return zeroTotals()
  return {
    ft: v.ft.min, ftC: v.ft.cnt,
    sw: v.sw.min, swC: v.sw.cnt, sa: v.sa.min, saC: v.sa.cnt,
    dw: v.dw.min, dwC: v.dw.cnt, da: v.da.min, daC: v.da.cnt,
    xc: v.xc.min, xcC: v.xc.cnt, inst: v.inst.min, instC: v.inst.cnt,
    other: 0, landings: v.landings,
  }
}

function addTotals(a: Totals, b: Totals): Totals {
  const out = zeroTotals()
  for (const k of Object.keys(out) as (keyof Totals)[]) out[k] = a[k] + b[k]
  return out
}

// 12行/ページを基本に、開始行オフセットと締め日での改ページを反映して分割する
function paginate(entries: PersonalLogEntry[], startRow: number, cutoffs: string[]) {
  const pages: { rows: PersonalLogEntry[]; padTop: number }[] = []
  const firstPad = Math.min(Math.max(startRow, 1), ROWS_PER_PAGE) - 1
  let cur: PersonalLogEntry[] = []
  let padTop = firstPad
  let cap = ROWS_PER_PAGE - padTop
  const close = () => {
    pages.push({ rows: cur, padTop })
    cur = []
    padTop = 0
    cap = ROWS_PER_PAGE
  }
  entries.forEach((e, i) => {
    cur.push(e)
    const next = entries[i + 1]
    const isCutoff = cutoffs.includes(e.date) && (!next || next.date > e.date)
    if (cur.length >= cap || isCutoff) close()
  })
  if (cur.length > 0 || pages.length === 0) close()
  return pages
}

// 全記録＋設定からページ割りを決定的に計算する。
// 出力範囲に関わらず同じページ割り・同じ繰越値になるため、
// 「45頁だけ」「47頁だけ」を後から出力しても紙の記録簿と一致する。
export function buildLogbookPages(entries: PersonalLogEntry[], options: LogbookOptions = {}) {
  const raw = paginate(entries, options.startRow ?? 1, options.cutoffDates ?? [])
  const startPage = options.startPage ?? 1
  let running = initialToTotals(options.initial)
  return raw.map(({ rows, padTop }, i) => {
    const page = calc(rows)
    const fwd = running
    const total = addTotals(fwd, page)
    running = total
    return { rows, padTop, page, fwd, total, pageNo: startPage + i }
  })
}

export function PersonalLogbookDocument({ entries, pilotName, options = {} }: {
  entries: PersonalLogEntry[]; pilotName: string; options?: LogbookOptions
}) {
  const all = buildLogbookPages(entries, options)
  const [rFrom, rTo] = options.pageRange ?? [all[0]?.pageNo ?? 1, all[all.length - 1]?.pageNo ?? 1]
  const pages = all.filter(p => p.pageNo >= rFrom && p.pageNo <= rTo)
  const render = pages.length > 0 ? pages : all
  const lastPageNo = all[all.length - 1]?.pageNo ?? 1
  return (
    <Document title={`個人飛行記録_${pilotName}`} author={pilotName}>
      {render.map(({ rows, padTop, page, fwd, total, pageNo }) => {
        const padBottom = Math.max(0, ROWS_PER_PAGE - padTop - rows.length)
        return (
          <Page key={pageNo} size="A4" orientation="landscape" style={s.page}>
            {/* タイトル */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6 }}>
              <Text style={{ fontSize: 11, fontWeight: 'bold' }}>個人飛行記録（ログブック）</Text>
              <Text style={{ fontSize: 7, marginLeft: 10 }}>氏名: {pilotName}</Text>
              <Text style={{ fontSize: 7, marginLeft: 'auto' }}>
                {rows.length > 0 ? `${rows[0].date} 〜 ${rows[rows.length - 1].date}  ` : ''}
                第 {pageNo} 頁（通算 {lastPageNo} 頁まで）
              </Text>
            </View>
            <View style={s.table}>
              <LogbookHeader />
              {Array.from({ length: padTop }).map((_, i) => <LogbookRow key={`t${i}`} />)}
              {rows.map(e => <LogbookRow key={e.id} e={e} />)}
              {Array.from({ length: padBottom }).map((_, i) => <LogbookRow key={`b${i}`} />)}
              <LogbookTotals
                page={page} fwd={fwd} total={total} pilotName={pilotName}
                first={rows[0]?.date} last={rows[rows.length - 1]?.date}
              />
            </View>
          </Page>
        )
      })}
    </Document>
  )
}

/* ---------- 航空日誌 Document ---------- */
const AL_COLS: { key: string; label: string; w?: number; align?: 'left' | 'right' | 'center' }[] = [
  { key: 'date', label: '日付', w: 52 },
  { key: 'pilot', label: '搭乗者', w: 64, align: 'left' },
  { key: 'instructor', label: '教官', w: 56, align: 'left' },
  { key: 'route', label: '区間', w: 96, align: 'left' },
  { key: 'time', label: '時刻', w: 64 },
  { key: 'ft', label: '飛行時間', w: 44, align: 'right' },
  { key: 'to', label: '離陸', w: 28, align: 'right' },
  { key: 'ld', label: '着陸', w: 28, align: 'right' },
  { key: 'airframe', label: '機体時間推移', w: 84, align: 'right' },
  { key: 'launch', label: '発航方法', w: 56, align: 'left' },
  { key: 'note', label: '飛行内容・整備メモ', align: 'left' },
]

export function AircraftLogDocument({ entries, registration, aircraftType }: {
  entries: AircraftLogEntry[]; registration: string; aircraftType: string
}) {
  const perPage = 24
  const pages: AircraftLogEntry[][] = []
  for (let i = 0; i < Math.max(entries.length, 1); i += perPage) {
    pages.push(entries.slice(i, i + perPage))
  }
  const totalTime = entries.reduce((s2, e) => s2 + e.flight_time, 0)
  const totalLd = entries.reduce((s2, e) => s2 + e.landing_count, 0)
  return (
    <Document title={`航空日誌_${registration}`}>
      {pages.map((rows, pi) => (
        <Page key={pi} size="A4" orientation="landscape" style={[s.page, { fontSize: 7 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: 'bold' }}>航空日誌</Text>
            <Text style={{ fontSize: 8, marginLeft: 10 }}>{registration}（{aircraftType}）</Text>
            <Text style={{ fontSize: 7, marginLeft: 'auto' }}>No. {pi + 1} / {pages.length}</Text>
          </View>
          <View style={s.table}>
            <View style={[s.row, { backgroundColor: '#eee', height: 18 }]}>
              {AL_COLS.map((c, i) => (
                <C key={c.key} w={c.w} h={18} label={c.label} size={6} bold last={i === AL_COLS.length - 1} />
              ))}
            </View>
            {rows.map(e => (
              <View key={e.id} style={[s.row, { height: 17 }]}>
                <C w={52} label={e.date} size={6} />
                <C w={64} label={e.pilot_name} size={6} align="left" />
                <C w={56} label={e.instructor_name ?? ''} size={6} align="left" />
                <C w={96} label={`${e.departure_place}→${e.arrival_place}`} size={6} align="left" />
                <C w={64} label={`${tm(e.departure_time)}-${e.arrival_time ? tm(e.arrival_time) : ''}`} size={6} />
                <C w={44} label={hhmm(e.flight_time)} size={6} align="right" />
                <C w={28} label={String(e.takeoff_count)} size={6} align="right" />
                <C w={28} label={String(e.landing_count)} size={6} align="right" />
                <C w={84} label={`${hhmm(e.initial_airframe_time)} → ${hhmm(e.final_airframe_time)}`} size={6} align="right" />
                <C w={56} label={e.launch_method_name ?? ''} size={6} align="left" />
                <C label={[e.flight_content, e.maintenance_note].filter(Boolean).join(' / ')} size={5.5} align="left" last />
              </View>
            ))}
            {pi === pages.length - 1 && (
              <View style={[s.row, { height: 18, backgroundColor: '#f5f5f5' }]}>
                <C w={52 + 64 + 56 + 96 + 64} h={18} label="合計" size={6.5} bold align="right" noBottom />
                <C w={44} h={18} label={hhmm(totalTime)} size={6.5} bold align="right" noBottom />
                <C w={28} h={18} label={String(entries.reduce((s2, e) => s2 + e.takeoff_count, 0))} size={6.5} bold align="right" noBottom />
                <C w={28} h={18} label={String(totalLd)} size={6.5} bold align="right" noBottom />
                <C w={84} h={18} label="" noBottom />
                <C w={56} h={18} label="" noBottom />
                <C h={18} label="" last noBottom />
              </View>
            )}
          </View>
        </Page>
      ))}
    </Document>
  )
}

/* ---------- 個人ログ シンプル一覧 Document ---------- */
export function PersonalSimpleListDocument({ entries, pilotName }: { entries: PersonalLogEntry[]; pilotName: string }) {
  const perPage = 24
  const pages: PersonalLogEntry[][] = []
  for (let i = 0; i < Math.max(entries.length, 1); i += perPage) {
    pages.push(entries.slice(i, i + perPage))
  }
  const total = entries.reduce((s2, e) => s2 + e.total_flight_time, 0)
  const totalLd = entries.reduce((s2, e) => s2 + e.landing_count, 0)
  return (
    <Document title={`個人飛行記録一覧_${pilotName}`} author={pilotName}>
      {pages.map((rows, pi) => (
        <Page key={pi} size="A4" orientation="landscape" style={[s.page, { fontSize: 7 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginBottom: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: 'bold' }}>個人飛行記録（一覧）</Text>
            <Text style={{ fontSize: 8, marginLeft: 10 }}>氏名: {pilotName}</Text>
            <Text style={{ fontSize: 7, marginLeft: 'auto' }}>No. {pi + 1} / {pages.length}</Text>
          </View>
          <View style={s.table}>
            <View style={[s.row, { backgroundColor: '#eee', height: 18 }]}>
              <C w={52} h={18} label="日付" size={6} bold />
              <C w={54} h={18} label="型式" size={6} bold />
              <C w={48} h={18} label="登録記号" size={6} bold />
              <C w={92} h={18} label="区間" size={6} bold />
              <C w={62} h={18} label="時刻" size={6} bold />
              <C w={40} h={18} label="飛行時間" size={6} bold />
              <C w={40} h={18} label="単独/機長" size={6} bold />
              <C w={40} h={18} label="同乗教育" size={6} bold />
              <C w={26} h={18} label="着陸" size={6} bold />
              <C w={56} h={18} label="発航方法" size={6} bold />
              <C w={56} h={18} label="教官" size={6} bold />
              <C h={18} label="飛行内容" size={6} bold last />
            </View>
            {rows.map(e => (
              <View key={e.id} style={[s.row, { height: 17 }]}>
                <C w={52} label={e.date} size={6} />
                <C w={54} label={e.aircraft_type} size={6} />
                <C w={48} label={e.registration_number} size={6} />
                <C w={92} label={`${e.departure_place}→${e.arrival_place}`} size={6} align="left" />
                <C w={62} label={`${tm(e.departure_time)}-${e.arrival_time ? tm(e.arrival_time) : ''}`} size={6} />
                <C w={40} label={hhmm(e.total_flight_time)} size={6} align="right" />
                <C w={40} label={hhmm((e.solo_time ?? 0) + (e.pic_time ?? 0))} size={6} align="right" />
                <C w={40} label={hhmm(e.dual_instruction_time)} size={6} align="right" />
                <C w={26} label={String(e.landing_count)} size={6} align="right" />
                <C w={56} label={e.launch_method_name ?? ''} size={6} align="left" />
                <C w={56} label={e.instructor_name ?? ''} size={6} align="left" />
                <C label={e.flight_content ?? ''} size={5.5} align="left" last />
              </View>
            ))}
            {pi === pages.length - 1 && (
              <View style={[s.row, { height: 18, backgroundColor: '#f5f5f5' }]}>
                <C w={52 + 54 + 48 + 92 + 62} h={18} label="合計" size={6.5} bold align="right" noBottom />
                <C w={40} h={18} label={hhmm(total)} size={6.5} bold align="right" noBottom />
                <C w={40} h={18} label="" noBottom />
                <C w={40} h={18} label="" noBottom />
                <C w={26} h={18} label={String(totalLd)} size={6.5} bold align="right" noBottom />
                <C w={56} h={18} label="" noBottom />
                <C w={56} h={18} label="" noBottom />
                <C h={18} label="" last noBottom />
              </View>
            )}
          </View>
        </Page>
      ))}
    </Document>
  )
}

export async function buildPersonalSimplePdf(entries: PersonalLogEntry[], pilotName: string): Promise<Blob> {
  ensureFonts()
  return pdf(<PersonalSimpleListDocument entries={entries} pilotName={pilotName} />).toBlob()
}

/* ---------- 生成・ダウンロード ---------- */
export async function buildPersonalLogbookPdf(entries: PersonalLogEntry[], pilotName: string, options?: LogbookOptions): Promise<Blob> {
  ensureFonts()
  return pdf(<PersonalLogbookDocument entries={entries} pilotName={pilotName} options={options} />).toBlob()
}

export async function buildAircraftLogPdf(entries: AircraftLogEntry[], registration: string, aircraftType: string): Promise<Blob> {
  ensureFonts()
  return pdf(<AircraftLogDocument entries={entries} registration={registration} aircraftType={aircraftType} />).toBlob()
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadPersonalLogbookPdf(entries: PersonalLogEntry[], pilotName: string, options?: LogbookOptions) {
  const blob = await buildPersonalLogbookPdf(entries, pilotName, options)
  download(blob, `個人飛行記録_${pilotName}_${new Date().toISOString().slice(0, 10)}.pdf`)
}

export async function downloadAircraftLogPdf(entries: AircraftLogEntry[], registration: string, aircraftType: string) {
  const blob = await buildAircraftLogPdf(entries, registration, aircraftType)
  download(blob, `航空日誌_${registration}_${new Date().toISOString().slice(0, 10)}.pdf`)
}
