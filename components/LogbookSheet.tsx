import type { PersonalLogEntry } from '@/lib/types'
import { formatMinutes } from '@/lib/utils'

const ROWS_PER_PAGE = 11

interface RowData {
  entry?: PersonalLogEntry
}

function hhmm(min?: number) {
  if (!min) return ''
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

function dateparts(d?: string) {
  if (!d) return { mon: '', day: '' }
  const dt = new Date(d)
  return { mon: String(dt.getMonth() + 1), day: String(dt.getDate()) }
}

function tm(iso?: string) {
  if (!iso) return ''
  const dt = new Date(iso)
  return `${String(dt.getHours()).padStart(2, '0')}${String(dt.getMinutes()).padStart(2, '0')}`
}

// One logbook page = ROWS_PER_PAGE data rows + 3 total rows
export default function LogbookSheet({
  entries,
  pilotName,
  forwardTime = 0,
  forwardCount = 0,
}: {
  entries: PersonalLogEntry[]
  pilotName: string
  forwardTime?: number
  forwardCount?: number
}) {
  const rows: RowData[] = []
  for (let i = 0; i < ROWS_PER_PAGE; i++) rows.push({ entry: entries[i] })

  // page subtotals — winch solo, aero solo, winch dual, aero dual (glider)
  const sum = (fn: (e: PersonalLogEntry) => number) =>
    entries.reduce((s, e) => s + fn(e), 0)

  const isWinch = (e: PersonalLogEntry) => (e.launch_method_name ?? '').includes('ウィンチ')
  const isSolo = (e: PersonalLogEntry) => (e.solo_time ?? 0) > 0 || ((e.pic_time ?? 0) > 0)

  const soloWinch = sum(e => (isWinch(e) && isSolo(e)) ? e.total_flight_time : 0)
  const soloAero = sum(e => (!isWinch(e) && isSolo(e)) ? e.total_flight_time : 0)
  const dualWinch = sum(e => (isWinch(e) && (e.dual_instruction_time ?? 0) > 0) ? e.total_flight_time : 0)
  const dualAero = sum(e => (!isWinch(e) && (e.dual_instruction_time ?? 0) > 0) ? e.total_flight_time : 0)
  const pageTime = sum(e => e.total_flight_time)
  const pageLandings = sum(e => e.landing_count)
  const ccTime = sum(e => e.cross_country_pic_solo_picus_time ?? 0)
  const instTime = sum(e => e.instruction_time ?? 0)

  const totalTime = forwardTime + pageTime
  const totalCount = forwardCount + pageLandings

  const cell = 'border border-black px-0.5 text-center align-middle'
  const th = 'border border-black text-center align-middle leading-tight font-normal'

  return (
    <div className="logbook-sheet bg-white text-black" style={{ fontFamily: 'serif' }}>
      <table className="w-full border-collapse" style={{ fontSize: '7px', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '3%' }} /><col style={{ width: '3%' }} />{/* date mon/day */}
          <col style={{ width: '7%' }} /><col style={{ width: '7%' }} />{/* type / reg */}
          <col style={{ width: '6%' }} /><col style={{ width: '6%' }} />{/* take off / landing place */}
          <col style={{ width: '5%' }} /><col style={{ width: '5%' }} />{/* take off / landing time */}
          <col style={{ width: '4%' }} />{/* no of landing */}
          <col style={{ width: '7%' }} />{/* flight time */}
          <col style={{ width: '6%' }} /><col style={{ width: '6%' }} />{/* solo winch/aero */}
          <col style={{ width: '6%' }} /><col style={{ width: '6%' }} />{/* dual winch/aero */}
          <col style={{ width: '4%' }} /><col style={{ width: '4%' }} />{/* release / max alt */}
          <col style={{ width: '6%' }} />{/* cross country */}
          <col style={{ width: '6%' }} />{/* instruction */}
          <col />{/* remarks */}
        </colgroup>
        <thead>
          {/* group header row */}
          <tr style={{ height: '14px' }}>
            <th className={th} colSpan={2} rowSpan={2}>(1) DATE<br />年月日</th>
            <th className={th} colSpan={2}>(2)(3) GLIDER 滑空機</th>
            <th className={th} colSpan={2}>(4) LOCATION 離着陸の区間</th>
            <th className={th} colSpan={2}>(5) TIME 時刻</th>
            <th className={th} rowSpan={2}>(6) 着陸回数<br />NO.OF<br />LANDING</th>
            <th className={th} colSpan={5}>(7) GLIDER 滑空機</th>
            <th className={th} colSpan={2}>ALTITUDE 高度</th>
            <th className={th} rowSpan={2}>(9) CROSS<br />COUNTRY<br />野外飛行</th>
            <th className={th} rowSpan={2}>(10) INST.<br />操縦教員<br />としての時間</th>
            <th className={th} rowSpan={3}>(11) REMARKS<br />補足事項<br />練習科目 その他</th>
          </tr>
          <tr style={{ height: '20px' }}>
            <th className={th}>TYPE<br />型式</th>
            <th className={th}>REG.NO<br />登録記号</th>
            <th className={th}>TAKE OFF<br />離陸地</th>
            <th className={th}>LANDING<br />着陸地</th>
            <th className={th}>TAKE OFF<br />離陸</th>
            <th className={th}>LANDING<br />着陸</th>
            <th className={th} rowSpan={2}>FLIGHT<br />TIME<br />飛行時間</th>
            <th className={th} colSpan={2}>SOLO OR P.I.C 単独又は機長</th>
            <th className={th} colSpan={2}>DUAL 同乗教育</th>
            <th className={th} rowSpan={2}>RELEASE<br />離脱</th>
            <th className={th} rowSpan={2}>MAX<br />最高</th>
          </tr>
          <tr style={{ height: '20px' }}>
            <th className={th} colSpan={2}>YEAR 年</th>
            <th className={th} colSpan={6}></th>
            <th className={th}>WINCH/AUTO<br />ウインチ曳航</th>
            <th className={th}>AERO TOW<br />航空機曳航</th>
            <th className={th}>WINCH/AUTO<br />ウインチ曳航</th>
            <th className={th}>AERO TOW<br />航空機曳航</th>
            <th className={th} colSpan={2}></th>
            <th className={th} colSpan={2}></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => {
            const e = r.entry
            const dp = dateparts(e?.date)
            const winch = e ? isWinch(e) : false
            const solo = e ? isSolo(e) : false
            const dual = e ? (e.dual_instruction_time ?? 0) > 0 : false
            return (
              <tr key={idx} style={{ height: '22px' }}>
                <td className={cell}>{dp.mon}</td>
                <td className={cell}>{dp.day}</td>
                <td className={cell}>{e?.aircraft_type ?? ''}</td>
                <td className={cell}>{e?.registration_number ?? ''}</td>
                <td className={cell}>{e?.departure_place ?? ''}</td>
                <td className={cell}>{e?.arrival_place ?? ''}</td>
                <td className={cell}>{tm(e?.departure_time)}</td>
                <td className={cell}>{tm(e?.arrival_time)}</td>
                <td className={cell}>{e?.landing_count || ''}</td>
                <td className={cell}>{hhmm(e?.total_flight_time)}</td>
                <td className={cell}>{e && solo && winch ? hhmm(e.total_flight_time) : ''}</td>
                <td className={cell}>{e && solo && !winch ? hhmm(e.total_flight_time) : ''}</td>
                <td className={cell}>{e && dual && winch ? hhmm(e.total_flight_time) : ''}</td>
                <td className={cell}>{e && dual && !winch ? hhmm(e.total_flight_time) : ''}</td>
                <td className={cell}>{e?.flight?.release_altitude ?? ''}</td>
                <td className={cell}>{e?.flight?.max_altitude ?? ''}</td>
                <td className={cell}>{hhmm(e?.cross_country_pic_solo_picus_time)}</td>
                <td className={cell}>{hhmm(e?.instruction_time)}</td>
                <td className={cell + ' text-left px-1'}>{e?.flight_content ?? ''}</td>
              </tr>
            )
          })}

          {/* PAGE TOTAL */}
          <tr style={{ height: '20px' }} className="font-medium">
            <td className={cell} colSpan={8}>PAGE TOTAL 頁小計</td>
            <td className={cell}>{pageLandings || ''}</td>
            <td className={cell}>{hhmm(pageTime)}</td>
            <td className={cell}>{hhmm(soloWinch)}</td>
            <td className={cell}>{hhmm(soloAero)}</td>
            <td className={cell}>{hhmm(dualWinch)}</td>
            <td className={cell}>{hhmm(dualAero)}</td>
            <td className={cell} colSpan={2}></td>
            <td className={cell}>{hhmm(ccTime)}</td>
            <td className={cell}>{hhmm(instTime)}</td>
            <td className={cell}></td>
          </tr>
          {/* AMT FORWARD */}
          <tr style={{ height: '20px' }}>
            <td className={cell} colSpan={8}>AMT. FORWARD 前頁までの合計</td>
            <td className={cell}>{forwardCount || ''}</td>
            <td className={cell}>{hhmm(forwardTime)}</td>
            <td className={cell} colSpan={9}></td>
          </tr>
          {/* TOTAL */}
          <tr style={{ height: '20px' }} className="font-bold">
            <td className={cell} colSpan={8}>TOTAL 総合計</td>
            <td className={cell}>{totalCount || ''}</td>
            <td className={cell}>{hhmm(totalTime)}</td>
            <td className={cell} colSpan={9}></td>
          </tr>
        </tbody>
      </table>
      <div className="flex justify-between items-end mt-2 px-1" style={{ fontSize: '8px' }}>
        <div>(14) 記載のとおり相違ありません　I CERTIFY THAT THE STATEMENTS MADE BY ME ON THIS FORM ARE TRUE.</div>
        <div>PILOT&apos;S NAME 氏名：<span className="border-b border-black inline-block min-w-[120px] text-center font-medium">{pilotName}</span></div>
      </div>
    </div>
  )
}
