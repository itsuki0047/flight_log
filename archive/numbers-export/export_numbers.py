# -*- coding: utf-8 -*-
"""個人ログ(PersonalLogEntry)を紙の航空日誌レイアウトの .numbers に出力する。

stdin: JSON {"pilot_name": str, "entries": [PersonalLogEntry...]}
argv[1]: 出力先パス
12フライト/ページで改ページし、頁小計・前頁までの合計・総合計を繰り越す。
要: pip3 install numbers-parser
"""
import json
import sys
import warnings

warnings.filterwarnings("ignore", module="numbers_parser")
from numbers_parser import Document, Border, RGB  # noqa: E402

warnings.filterwarnings("ignore", category=RuntimeWarning, module="numbers_parser.document")

BLACK = RGB(0, 0, 0)
ROWS, COLS = 21, 40
DATA_TOP, DATA_ROWS = 3, 12
COL_WIDTHS = [28, 28, 61, 58, 49, 49, 43, 43, 43, 26, 26, 26, 26, 26, 26, 26,
              26, 26, 26, 43, 43, 28, 28, 26, 26, 26, 26, 26, 26, 26, 26, 26,
              26, 26, 26, 26, 29, 26, 26, 181]
ROW_HEIGHTS = [27, 27, 31] + [25] * 12 + [27] * 6

PAIRS = {
    "ft": (9, 10),
    "solo_winch": (11, 12), "solo_aero": (13, 14),
    "dual_winch": (15, 16), "dual_aero": (17, 18),
    "mg_ft": (23, 24),
    "mg_solo_motor": (25, 26), "mg_solo_glider": (27, 28),
    "mg_dual_motor": (29, 30), "mg_dual_glider": (31, 32),
    "xc": (33, 34), "inst": (35, 36), "other": (37, 38),
}
MG_LAND_COLS = (21, 22)

HEADERS = [
    (0, 0, 1, 1, "YEAR\n年"),
    (2, 0, 2, 0, "MON\n月"), (2, 1, 2, 1, "DAY\n日"),
    (0, 2, 1, 3, "GLIDER\n滑　空　機"),
    (2, 2, 2, 2, "TYPE\n型　式"), (2, 3, 2, 3, "REG. NO\n登録記号"),
    (0, 4, 1, 5, "LOCATION\n離着陸の区間"),
    (2, 4, 2, 4, "TAKE OFF\n離陸地"), (2, 5, 2, 5, "LANDING\n着陸地"),
    (0, 6, 1, 7, "TIME\n時　刻"),
    (2, 6, 2, 6, "TAKE OFF\n離　陸"), (2, 7, 2, 7, "LANDING\n着　陸"),
    (0, 8, 2, 8, "NO. OF\nLANDING\n着陸回数"),
    (0, 9, 0, 18, "GLIDER　滑　空　機"),
    (1, 9, 2, 10, "FLIGHT TIME\n飛行時間"),
    (1, 11, 1, 14, "SOLO OR P.I.C\n単独又は機長"),
    (2, 11, 2, 12, "WINCH/AUTO\nウインチ曳航"), (2, 13, 2, 14, "AERO TOW\n航空機曳航"),
    (1, 15, 1, 18, "DUAL\n同　乗　教　育"),
    (2, 15, 2, 16, "WINCH/AUTO\nウインチ曳航"), (2, 17, 2, 18, "AERO TOW\n航空機曳航"),
    (0, 19, 0, 20, "ALTITUDE\n高　度"),
    (1, 19, 2, 19, "RELEASE\n離　脱"), (1, 20, 2, 20, "MAX.\n最　高"),
    (0, 21, 0, 32, "MOTOR GLIDER　動　力　滑　空　機"),
    (1, 21, 1, 22, "NO. OF LAND\n着陸回数"),
    (2, 21, 2, 21, "GLIDER\n滑　空"), (2, 22, 2, 22, "MOTOR\n動　力"),
    (1, 23, 2, 24, "FLIGHT TIME\n飛行時間"),
    (1, 25, 1, 28, "SOLO OR P.I.C\n単独又は機長"),
    (2, 25, 2, 26, "MOTOR\n動　力"), (2, 27, 2, 28, "GLIDER\n滑　空"),
    (1, 29, 1, 32, "DUAL\n同　乗　教　育"),
    (2, 29, 2, 30, "MOTOR\n動　力"), (2, 31, 2, 32, "GLIDER\n滑　空"),
    (0, 33, 2, 34, "CROSS\nCOUNTRY TIME\n野外飛行"),
    (0, 35, 2, 36, "INSTRUCTION\nTIME\n操縦教員と\nしての時間"),
    (0, 37, 2, 38, "その他の\n飛行時間"),
    (0, 39, 2, 39, "REMARKS\n補　足　事　項\n練習科目　その他"),
]
FOOT_LABELS = [
    (15, 6, 16, 7, "PAGE TOTAL\n頁　小　計"),
    (17, 6, 18, 7, "AMT. FORWARD\n前頁までの合計"),
    (19, 6, 20, 7, "TOTAL\n総　合　計"),
]


def _ref(r1, c1, r2, c2):
    def a(c):
        s = ""
        c += 1
        while c:
            c, rem = divmod(c - 1, 26)
            s = chr(65 + rem) + s
        return s
    return f"{a(c1)}{r1 + 1}:{a(c2)}{r2 + 1}"


def _write_int(table, row, col, value):
    table.write(row, col, int(value))
    table.set_cell_formatting(row, col, "number", decimal_places=0)


def _write_time(table, row, pair, minutes, always_hours=False):
    if minutes <= 0 and not always_hours:
        return
    h, m = divmod(max(int(minutes), 0), 60)
    if h > 0 or always_hours:
        _write_int(table, row, pair[0], h)
    _write_int(table, row, pair[1], m)


def _hhmm(iso):
    """ISO日時 or 'HH:MM' → 'HH:MM'"""
    if not iso:
        return ""
    s = str(iso)
    if "T" in s:
        s = s.split("T")[1]
    return s[:5]


def _date_parts(iso):
    d = str(iso).split("T")[0]
    y, m, dd = d.split("-")
    return int(y), int(m), int(dd)


def _is_winch(entry):
    name = entry.get("launch_method_name") or ""
    return "ウインチ" in name or "ウィンチ" in name or "自動車" in name


def _entry_to_row(e):
    """PersonalLogEntry → ({列: 値}, {ペア名: 分})"""
    cells, times = {}, {}
    _, mon, day = _date_parts(e["date"])
    cells[0], cells[1] = mon, day
    cells[2] = e.get("aircraft_type") or ""
    cells[3] = e.get("registration_number") or ""
    cells[4] = e.get("departure_place") or ""
    cells[5] = e.get("arrival_place") or ""
    cells[6] = _hhmm(e.get("departure_time"))
    cells[7] = _hhmm(e.get("arrival_time"))
    if e.get("landing_count"):
        cells[8] = int(e["landing_count"])
    if e.get("release_altitude"):
        cells[19] = int(e["release_altitude"])
    if e.get("max_altitude"):
        cells[20] = int(e["max_altitude"])
    cells[39] = e.get("flight_content") or e.get("supplementary_note") or ""

    total = int(e.get("total_flight_time") or 0)
    times["ft"] = total
    dual = (e.get("dual_instruction_time") or 0) > 0
    winch = _is_winch(e)
    key = f"{'dual' if dual else 'solo'}_{'winch' if winch else 'aero'}"
    times[key] = total

    for pk, field in (("xc", "cross_country_pic_solo_picus_time"),
                      ("inst", "instruction_time"),
                      ("other", "other_flight_time")):
        v = int(e.get(field) or 0)
        if v > 0:
            times[pk] = v
    return cells, times


def _layout(table):
    for c, w in enumerate(COL_WIDTHS):
        table.col_width(c, w)
    for r, h in enumerate(ROW_HEIGHTS):
        table.row_height(r, h)
    for r1, c1, r2, c2, text in HEADERS + FOOT_LABELS:
        table.write(r1, c1, text)
        if (r1, c1) != (r2, c2):
            table.merge_cells(_ref(r1, c1, r2, c2))
    for r in (15, 17, 19):
        table.write(r, 8, "TIME\n時　間")
        table.write(r + 1, 8, "NO.\n回　数")
    table.write(15, 39, "NOTES\n備考")
    table.merge_cells(_ref(15, 39, 20, 39))
    table.merge_cells(_ref(15, 0, 20, 5))
    for hc, mc in PAIRS.values():
        for r in (16, 18, 20):
            table.merge_cells(_ref(r, hc, r, mc))


def _style(doc, table, styles):
    for r in range(ROWS):
        for c in range(COLS):
            if r <= 2:
                s = styles["hdr"]
            elif r < 15:
                s = styles["data"]
            elif c <= 8:
                s = styles["label"]
            else:
                s = styles["val"]
            table.set_cell_style(r, c, s)
    table.set_cell_style(15, 0, styles["cert"])
    table.set_cell_style(15, 39, styles["notes"])


def _borders(table):
    solid = Border(1.0, BLACK, "solid")
    dash = Border(1.0, BLACK, "dashes")
    thick = Border(2.0, BLACK, "solid")
    dash_right = {0, 2, 4, 6} | {hc for hc, _ in PAIRS.values()}
    for r in range(ROWS):
        for c in range(COLS):
            table.set_cell_border(r, c, ["top", "bottom", "left", "right"], solid)
    for r in range(DATA_TOP, ROWS):
        for c in dash_right:
            table.set_cell_border(r, c, ["right"], dash)
    for c in range(COLS):
        table.set_cell_border(0, c, ["top"], thick)
        table.set_cell_border(2, c, ["bottom"], thick)
        table.set_cell_border(14, c, ["bottom"], thick)
        table.set_cell_border(ROWS - 1, c, ["bottom"], thick)
    for r in range(ROWS):
        table.set_cell_border(r, 0, ["left"], thick)
        table.set_cell_border(r, 20, ["right"], thick)
        table.set_cell_border(r, COLS - 1, ["right"], thick)


def _cnt(n):
    return f"{n}回" if n > 0 else "回"


def _fill(table, entries, forward, pilot_name):
    page = {k: {"min": 0, "cnt": 0} for k in PAIRS}
    for i, e in enumerate(entries):
        row = DATA_TOP + i
        cells, times = _entry_to_row(e)
        for c, v in cells.items():
            if isinstance(v, int):
                _write_int(table, row, c, v)
            elif v != "":
                table.write(row, c, v)
        for key, minutes in times.items():
            if minutes > 0:
                _write_time(table, row, PAIRS[key], minutes)
                page[key]["min"] += minutes
                page[key]["cnt"] += 1

    total = {}
    for key, pair in PAIRS.items():
        fwd = forward.get(key, {"min": 0, "cnt": 0})
        tot = {"min": fwd["min"] + page[key]["min"], "cnt": fwd["cnt"] + page[key]["cnt"]}
        total[key] = tot
        for r, vals in ((15, page[key]), (17, fwd), (19, tot)):
            _write_time(table, r, pair, vals["min"], always_hours=True)
            table.write(r + 1, pair[0], _cnt(vals["cnt"]))
    for c in MG_LAND_COLS:
        for r in (16, 18, 20):
            table.write(r, c, "回")

    if entries:
        y1, m1, d1 = _date_parts(min(e["date"] for e in entries))
        y2, m2, d2 = _date_parts(max(e["date"] for e in entries))
        span = f"{y1}年{m1}月{d1}日 ～ {y2}年{m2}月{d2}日"
    else:
        span = "　　年　　月　　日 ～ 　　年　　月　　日"
    table.write(15, 0,
                f"{span}\n\nI CERTIFY THAT THE STATEMENTS MADE BY ME ON THIS FORM ARE TRUE.\n"
                f"記載のとおり相違ありません\n\nPILOT'S NAME\n氏　名　{pilot_name or '　　　　　　　　　　'}")
    return total


def export_numbers(entries, path, pilot_name=""):
    entries = sorted(entries, key=lambda e: (str(e["date"]), str(e.get("departure_time") or "")))
    pages = [entries[i:i + DATA_ROWS] for i in range(0, len(entries), DATA_ROWS)] or [[]]

    doc = Document(sheet_name="1ページ", num_rows=ROWS, num_cols=COLS)
    styles = {
        "hdr": doc.add_style(name="hdr", font_size=7.0, alignment=("center", "middle"), text_wrap=True),
        "data": doc.add_style(name="data", font_size=9.0, alignment=("center", "middle"), text_wrap=False),
        "label": doc.add_style(name="label", font_size=7.0, alignment=("center", "middle"), text_wrap=True),
        "val": doc.add_style(name="val", font_size=9.0, alignment=("center", "middle"), text_wrap=False),
        "cert": doc.add_style(name="cert", font_size=8.0, alignment=("center", "middle"), text_wrap=True),
        "notes": doc.add_style(name="notes", font_size=9.0, alignment=("left", "top"), text_wrap=True),
    }
    for i in range(1, len(pages)):
        doc.add_sheet(f"{i + 1}ページ", num_rows=ROWS, num_cols=COLS)

    forward = {}
    for sheet, page_entries in zip(doc.sheets, pages):
        table = sheet.tables[0]
        table.table_name_enabled = False
        _layout(table)
        _style(doc, table, styles)
        forward = _fill(table, page_entries, forward, pilot_name)
        _borders(table)
    doc.save(path, package=False)


if __name__ == "__main__":
    payload = json.load(sys.stdin)
    export_numbers(payload.get("entries", []), sys.argv[1],
                   pilot_name=payload.get("pilot_name", ""))
    print("ok")
