import type { PersonalLogEntry } from '@/lib/types'

const ROWS_PER_PAGE = 11

function hhmm(min?: number) {
  if (!min) return ''
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}:${String(m).padStart(2, '0')}`
}
function dpart(d?: string) {
  if (!d) return { mon: '', day: '' }
  const dt = new Date(d)
  return { mon: String(dt.getMonth() + 1), day: String(dt.getDate()) }
}
function tm(iso?: string) {
  if (!iso) return ''
  const dt = new Date(iso)
  return `${String(dt.getHours()).padStart(2, '0')}${String(dt.getMinutes()).padStart(2, '0')}`
}
function ymd(d?: string) {
  if (!d) return { y: '', m: '', d: '' }
  const dt = new Date(d)
  return { y: String(dt.getFullYear()), m: String(dt.getMonth() + 1), d: String(dt.getDate()) }
}

const isWinch = (e: PersonalLogEntry) => (e.launch_method_name ?? '').includes('ウィンチ') || (e.launch_method_name ?? '').includes('ウインチ')
const isSolo = (e: PersonalLogEntry) =>
  (e.solo_time ?? 0) > 0 || (e.pic_time ?? 0) > 0 || ((e.dual_instruction_time ?? 0) === 0)

interface Totals {
  swT: number; swC: number; saT: number; saC: number
  dwT: number; dwC: number; daT: number; daC: number
  ft: number; cc: number; ccC: number; inst: number; instC: number; other: number
}
function calc(entries: PersonalLogEntry[]): Totals {
  const o: Totals = { swT: 0, swC: 0, saT: 0, saC: 0, dwT: 0, dwC: 0, daT: 0, daC: 0, ft: 0, cc: 0, ccC: 0, inst: 0, instC: 0, other: 0 }
  for (const e of entries) {
    const t = e.total_flight_time
    const winch = isWinch(e)
    const dual = (e.dual_instruction_time ?? 0) > 0
    if (dual) {
      if (winch) { o.dwT += t; o.dwC++ } else { o.daT += t; o.daC++ }
    } else {
      if (winch) { o.swT += t; o.swC++ } else { o.saT += t; o.saC++ }
    }
    o.ft += t
    const cc = e.cross_country_pic_solo_picus_time ?? 0
    if (cc) { o.cc += cc; o.ccC++ }
    const ins = e.instruction_time ?? 0
    if (ins) { o.inst += ins; o.instC++ }
    o.other += e.other_flight_time ?? 0
  }
  return o
}
const cnt = (n: number) => (n > 0 ? `${n}回` : '回')

export default function LogbookSheet({
  entries,
  priorEntries = [],
  pilotName,
}: {
  entries: PersonalLogEntry[]
  priorEntries?: PersonalLogEntry[]
  pilotName: string
}) {
  const rows: (PersonalLogEntry | undefined)[] = []
  for (let i = 0; i < ROWS_PER_PAGE; i++) rows.push(entries[i])

  const page = calc(entries)
  const fwd = calc(priorEntries)
  const total = calc([...priorEntries, ...entries])

  const firstDate = entries[0]?.date
  const lastDate = entries[entries.length - 1]?.date
  const f = ymd(firstDate)
  const l = ymd(lastDate)

  const c = 'border border-black px-0.5 align-middle text-center'
  const th = 'border border-black text-center align-middle leading-tight font-normal'

  // value cells (cols 10..26) for a totals row
  function timeCells(o: Totals, key: string) {
    const v = [
      hhmm(o.ft), hhmm(o.swT), hhmm(o.saT), hhmm(o.dwT), hhmm(o.daT),
      '', '',            // release, max
      '', '', '',        // mg land g/m, mg flight time
      '', '', '', '',    // mg solo m/g, dual m/g
      hhmm(o.cc), hhmm(o.inst), hhmm(o.other),
    ]
    return v.map((x, i) => <td key={`${key}-t-${i}`} className={c}>{x}</td>)
  }
  function countCells(o: Totals, key: string) {
    const v = [
      '', cnt(o.swC), cnt(o.saC), cnt(o.dwC), cnt(o.daC),
      '', '',
      cnt(0), cnt(0), '',
      cnt(0), cnt(0), cnt(0), cnt(0),
      cnt(o.ccC), cnt(o.instC), '',
    ]
    return v.map((x, i) => <td key={`${key}-c-${i}`} className={c}>{x}</td>)
  }

  return (
    <div className="logbook-sheet bg-white text-black overflow-x-auto" style={{ fontFamily: 'serif' }}>
      <table className="border-collapse" style={{ fontSize: '6.5px', tableLayout: 'fixed', width: '1180px' }}>
        <colgroup>
          <col style={{ width: '1.8%' }} /><col style={{ width: '1.8%' }} />{/* 月 日 */}
          <col style={{ width: '5%' }} /><col style={{ width: '5%' }} />{/* type reg */}
          <col style={{ width: '4%' }} /><col style={{ width: '4%' }} />{/* take/land place */}
          <col style={{ width: '3.2%' }} /><col style={{ width: '3.2%' }} />{/* take/land time */}
          <col style={{ width: '2.6%' }} />{/* no of landing */}
          <col style={{ width: '4.5%' }} />{/* glider flight time */}
          <col style={{ width: '3.2%' }} /><col style={{ width: '3.2%' }} />{/* solo winch/aero */}
          <col style={{ width: '3.2%' }} /><col style={{ width: '3.2%' }} />{/* dual winch/aero */}
          <col style={{ width: '2.6%' }} /><col style={{ width: '2.6%' }} />{/* release/max */}
          <col style={{ width: '2.4%' }} /><col style={{ width: '2.4%' }} />{/* mg land glider/motor */}
          <col style={{ width: '3.5%' }} />{/* mg flight time */}
          <col style={{ width: '2.8%' }} /><col style={{ width: '2.8%' }} />{/* mg solo motor/glider */}
          <col style={{ width: '2.8%' }} /><col style={{ width: '2.8%' }} />{/* mg dual motor/glider */}
          <col style={{ width: '3.5%' }} />{/* cross country */}
          <col style={{ width: '3.5%' }} />{/* instruction */}
          <col style={{ width: '3.5%' }} />{/* other time */}
          <col />{/* remarks */}
        </colgroup>

        <thead>
          {/* group row */}
          <tr style={{ height: '12px' }}>
            <th className={th} colSpan={2} rowSpan={2}>(1) DATE<br />年月日</th>
            <th className={th} colSpan={2}>(2)(3) GLIDER 滑空機</th>
            <th className={th} colSpan={2}>(4) LOCATION 離着陸の区間</th>
            <th className={th} colSpan={2}>(5) TIME 時刻</th>
            <th className={th} rowSpan={3}>(6) NO.OF<br />LANDING<br />着陸回数</th>
            <th className={th} colSpan={5}>(7) GLIDER 滑空機</th>
            <th className={th} colSpan={2}>ALTITUDE 高度</th>
            <th className={th} colSpan={7}>(8) MOTOR GLIDER 動力滑空機</th>
            <th className={th} rowSpan={3}>(9) CROSS<br />COUNTRY<br />TIME<br />野外飛行</th>
            <th className={th} rowSpan={3}>(10) INST.<br />TIME<br />操縦教員<br />としての時間</th>
            <th className={th} rowSpan={3}>その他の<br />飛行時間</th>
            <th className={th} rowSpan={3}>(11) REMARKS<br />補足事項<br />練習科目 その他</th>
          </tr>
          {/* sub row */}
          <tr style={{ height: '16px' }}>
            <th className={th} rowSpan={2}>TYPE<br />型式</th>
            <th className={th} rowSpan={2}>REG.NO<br />登録記号</th>
            <th className={th} rowSpan={2}>TAKE OFF<br />離陸地</th>
            <th className={th} rowSpan={2}>LANDING<br />着陸地</th>
            <th className={th} rowSpan={2}>TAKE OFF<br />離陸</th>
            <th className={th} rowSpan={2}>LANDING<br />着陸</th>
            <th className={th} rowSpan={2}>FLIGHT<br />TIME<br />飛行時間</th>
            <th className={th} colSpan={2}>SOLO OR P.I.C<br />単独又は機長</th>
            <th className={th} colSpan={2}>DUAL<br />同乗教育</th>
            <th className={th} rowSpan={2}>RELEASE<br />離脱</th>
            <th className={th} rowSpan={2}>MAX<br />最高</th>
            <th className={th} colSpan={2}>NO.OF LAND<br />着陸回数</th>
            <th className={th} rowSpan={2}>FLIGHT<br />TIME<br />飛行時間</th>
            <th className={th} colSpan={2}>SOLO OR P.I.C<br />単独又は機長</th>
            <th className={th} colSpan={2}>DUAL<br />同乗教育</th>
          </tr>
          {/* leaf row */}
          <tr style={{ height: '18px' }}>
            <th className={th}>月</th>
            <th className={th}>日</th>
            <th className={th}>WINCH<br />/AUTO<br />ウインチ曳航</th>
            <th className={th}>AERO TOW<br />航空機曳航</th>
            <th className={th}>WINCH<br />/AUTO<br />ウインチ曳航</th>
            <th className={th}>AERO TOW<br />航空機曳航</th>
            <th className={th}>GLIDER<br />滑空</th>
            <th className={th}>MOTOR<br />動力</th>
            <th className={th}>MOTOR<br />動力</th>
            <th className={th}>GLIDER<br />滑空</th>
            <th className={th}>MOTOR<br />動力</th>
            <th className={th}>GLIDER<br />滑空</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((e, idx) => {
            const dp = dpart(e?.date)
            const winch = e ? isWinch(e) : false
            const dual = e ? (e.dual_instruction_time ?? 0) > 0 : false
            const solo = !dual
            return (
              <tr key={idx} style={{ height: '20px' }}>
                <td className={c}>{dp.mon}</td>
                <td className={c}>{dp.day}</td>
                <td className={c}>{e?.aircraft_type ?? ''}</td>
                <td className={c}>{e?.registration_number ?? ''}</td>
                <td className={c}>{e?.departure_place ?? ''}</td>
                <td className={c}>{e?.arrival_place ?? ''}</td>
                <td className={c}>{tm(e?.departure_time)}</td>
                <td className={c}>{tm(e?.arrival_time)}</td>
                <td className={c}>{e?.landing_count || ''}</td>
                <td className={c}>{hhmm(e?.total_flight_time)}</td>
                <td className={c}>{e && solo && winch ? hhmm(e.total_flight_time) : ''}</td>
                <td className={c}>{e && solo && !winch ? hhmm(e.total_flight_time) : ''}</td>
                <td className={c}>{e && dual && winch ? hhmm(e.total_flight_time) : ''}</td>
                <td className={c}>{e && dual && !winch ? hhmm(e.total_flight_time) : ''}</td>
                <td className={c}>{e?.flight?.release_altitude ?? ''}</td>
                <td className={c}>{e?.flight?.max_altitude ?? ''}</td>
                <td className={c}></td>{/* mg land glider */}
                <td className={c}></td>{/* mg land motor */}
                <td className={c}></td>{/* mg flight time */}
                <td className={c}></td>{/* mg solo motor */}
                <td className={c}></td>{/* mg solo glider */}
                <td className={c}></td>{/* mg dual motor */}
                <td className={c}></td>{/* mg dual glider */}
                <td className={c}>{hhmm(e?.cross_country_pic_solo_picus_time)}</td>
                <td className={c}>{hhmm(e?.instruction_time)}</td>
                <td className={c}>{hhmm(e?.other_flight_time)}</td>
                <td className={c + ' text-left px-1'}>{e?.flight_content ?? ''}</td>
              </tr>
            )
          })}

          {/* ---- totals block: certify (left) + 3 totals × (TIME/回数) + NOTES (right) ---- */}
          {/* PAGE TOTAL - TIME */}
          <tr style={{ height: '16px' }}>
            <td className={c + ' text-left align-top p-1'} colSpan={6} rowSpan={6}>
              <div style={{ fontSize: '6px', lineHeight: '1.5' }}>
                <div>(14)　YEAR MONTH DAY ～ YEAR MONTH DAY</div>
                <div>　　{f.y} 年 {f.m} 月 {f.d} 日 ～ {l.y} 年 {l.m} 月 {l.d} 日</div>
                <div className="mt-1">I CERTIFY THAT THE STATEMENTS MADE BY ME ON THIS FORM ARE TRUE.</div>
                <div>記載のとおり相違ありません</div>
                <div className="mt-2">PILOT&apos;S NAME　氏名</div>
                <div className="mt-1">　<span className="inline-block border-b border-black min-w-[140px] text-center font-medium">{pilotName}</span></div>
              </div>
            </td>
            <td className={c + ' font-medium'} colSpan={2} rowSpan={2}>PAGE TOTAL<br />頁小計</td>
            <td className={c}>TIME 時間</td>
            {timeCells(page, 'page')}
            <td className={c + ' text-left align-top p-1'} rowSpan={6}>
              <div style={{ fontSize: '7px' }}>NOTES<br />備考</div>
            </td>
          </tr>
          {/* PAGE TOTAL - 回数 */}
          <tr style={{ height: '16px' }}>
            <td className={c}>NO. 回数</td>
            {countCells(page, 'page')}
          </tr>
          {/* AMT FORWARD - TIME */}
          <tr style={{ height: '16px' }}>
            <td className={c} colSpan={2} rowSpan={2}>AMT. FORWARD<br />前頁までの合計</td>
            <td className={c}>TIME 時間</td>
            {timeCells(fwd, 'fwd')}
          </tr>
          {/* AMT FORWARD - 回数 */}
          <tr style={{ height: '16px' }}>
            <td className={c}>NO. 回数</td>
            {countCells(fwd, 'fwd')}
          </tr>
          {/* TOTAL - TIME */}
          <tr style={{ height: '16px' }} className="font-bold">
            <td className={c} colSpan={2} rowSpan={2}>TOTAL<br />総合計</td>
            <td className={c}>TIME 時間</td>
            {timeCells(total, 'total')}
          </tr>
          {/* TOTAL - 回数 */}
          <tr style={{ height: '16px' }} className="font-bold">
            <td className={c}>NO. 回数</td>
            {countCells(total, 'total')}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
