import csv
import math
import pathlib
from datetime import date

BASE = pathlib.Path(__file__).resolve().parent
SCORED_CSV = BASE / "powersearch_semiconductor_fund_scored.csv"
PDF_OUT = BASE / "powersearch_semiconductor_fund_report.pdf"
INITIAL_INVESTMENT = 2_000_000


def to_float(v):
    if v is None:
        return None
    s = str(v).strip().replace(",", "")
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def fmt_num(v, digits=0):
    if v is None:
        return "-"
    return f"{v:,.{digits}f}"


def fmt_pct(v, digits=2):
    if v is None:
        return "-"
    return f"{v:.{digits}f}%"


def fmt_yen(v):
    if v is None:
        return "-"
    return f"{round(v):,}円"


def short_name(r):
    return (r.get("ファンド名略称") or r.get("ファンド名") or "").replace("インデックス", "インデ").replace("ファンド", "F").replace("半導体関連", "半導体")


def read_rows():
    with SCORED_CSV.open("r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))
    for r in rows:
        for k in list(r.keys()):
            if k in {
                "総合順位", "総合スコア", "成長性スコア", "リスク調整スコア", "低コストスコア", "使いやすさスコア", "5年実績スコア",
                "5年試算_標準15pct", "5年試算_1σ下落後回復", "5年試算_強気30pct", "5年信託報酬影響額_15pct前提",
                "信託報酬", "純資産(百万円)", "トータルリターン(1年)", "シャープレシオ(1年)", "標準偏差（σ-シグマ）（1年）",
                "トータルリターン(3年)", "販売金額ランキング"
            }:
                r[k + "_num"] = to_float(r.get(k))
        r["short"] = short_name(r)
    rows.sort(key=lambda x: x.get("総合順位_num") or 999)
    return rows


class PDF:
    def __init__(self):
        self.objects = []
        self.pages = []
        self.catalog_id = self.add(b"")
        self.pages_id = self.add(b"")
        self.fontdesc_id = self.add(b"")
        self.cidfont_id = self.add(b"")
        self.font_id = self.add(b"")
        self.set_obj(self.fontdesc_id, b"<< /Type /FontDescriptor /FontName /HeiseiKakuGo-W5 /Flags 6 /FontBBox [0 -200 1000 900] /ItalicAngle 0 /Ascent 880 /Descent -120 /CapHeight 700 /StemV 80 >>")
        self.set_obj(self.cidfont_id, f"<< /Type /Font /Subtype /CIDFontType0 /BaseFont /HeiseiKakuGo-W5 /CIDSystemInfo << /Registry (Adobe) /Ordering (Japan1) /Supplement 5 >> /FontDescriptor {self.fontdesc_id} 0 R >>".encode("ascii"))
        self.set_obj(self.font_id, f"<< /Type /Font /Subtype /Type0 /BaseFont /HeiseiKakuGo-W5 /Encoding /UniJIS-UCS2-H /DescendantFonts [{self.cidfont_id} 0 R] >>".encode("ascii"))

    def add(self, data):
        self.objects.append(data)
        return len(self.objects)

    def set_obj(self, obj_id, data):
        self.objects[obj_id - 1] = data

    @staticmethod
    def text_hex(s):
        return s.encode("utf-16-be", errors="replace").hex().upper()

    def add_page(self, commands, width=842, height=595):
        stream = "\n".join(commands).encode("ascii")
        stream_obj = self.add(b"<< /Length " + str(len(stream)).encode("ascii") + b" >>\nstream\n" + stream + b"\nendstream")
        page_obj = self.add(
            f"<< /Type /Page /Parent {self.pages_id} 0 R /MediaBox [0 0 {width} {height}] /Resources << /Font << /F1 {self.font_id} 0 R >> >> /Contents {stream_obj} 0 R >>".encode("ascii")
        )
        self.pages.append(page_obj)

    def save(self, path):
        kids = " ".join(f"{p} 0 R" for p in self.pages)
        self.set_obj(self.pages_id, f"<< /Type /Pages /Kids [{kids}] /Count {len(self.pages)} >>".encode("ascii"))
        self.set_obj(self.catalog_id, f"<< /Type /Catalog /Pages {self.pages_id} 0 R >>".encode("ascii"))
        out = bytearray(b"%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")
        offsets = [0]
        for i, obj in enumerate(self.objects, 1):
            offsets.append(len(out))
            out.extend(f"{i} 0 obj\n".encode("ascii"))
            out.extend(obj)
            out.extend(b"\nendobj\n")
        xref = len(out)
        out.extend(f"xref\n0 {len(self.objects)+1}\n".encode("ascii"))
        out.extend(b"0000000000 65535 f \n")
        for off in offsets[1:]:
            out.extend(f"{off:010d} 00000 n \n".encode("ascii"))
        out.extend(f"trailer\n<< /Size {len(self.objects)+1} /Root {self.catalog_id} 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode("ascii"))
        path.write_bytes(bytes(out))


class Canvas:
    def __init__(self):
        self.c = []

    def rgb(self, r, g, b):
        self.c.append(f"{r:.3f} {g:.3f} {b:.3f} rg")

    def stroke_rgb(self, r, g, b):
        self.c.append(f"{r:.3f} {g:.3f} {b:.3f} RG")

    def rect(self, x, y, w, h, fill=(1, 1, 1), stroke=None):
        self.rgb(*fill)
        if stroke:
            self.stroke_rgb(*stroke)
            self.c.append(f"{x:.1f} {y:.1f} {w:.1f} {h:.1f} re B")
        else:
            self.c.append(f"{x:.1f} {y:.1f} {w:.1f} {h:.1f} re f")

    def line(self, x1, y1, x2, y2, color=(0.7, 0.75, 0.8), width=0.6):
        self.stroke_rgb(*color)
        self.c.append(f"{width:.2f} w {x1:.1f} {y1:.1f} m {x2:.1f} {y2:.1f} l S")

    def circle(self, x, y, r, fill=(0.2, 0.5, 0.9)):
        # Bezier approximation for circle
        k = 0.5522847498 * r
        self.rgb(*fill)
        self.c.append(f"{x+r:.1f} {y:.1f} m {x+r:.1f} {y+k:.1f} {x+k:.1f} {y+r:.1f} {x:.1f} {y+r:.1f} c {x-k:.1f} {y+r:.1f} {x-r:.1f} {y+k:.1f} {x-r:.1f} {y:.1f} c {x-r:.1f} {y-k:.1f} {x-k:.1f} {y-r:.1f} {x:.1f} {y-r:.1f} c {x+k:.1f} {y-r:.1f} {x+r:.1f} {y-k:.1f} {x+r:.1f} {y:.1f} c f")

    def text(self, x, y, s, size=10, color=(0.05, 0.09, 0.16)):
        s = str(s).replace("\n", " ")
        self.rgb(*color)
        self.c.append(f"BT /F1 {size:.1f} Tf 1 0 0 1 {x:.1f} {y:.1f} Tm <{PDF.text_hex(s)}> Tj ET")

    def wrapped(self, x, y, s, size=10, max_units=70, leading=None, color=(0.05, 0.09, 0.16)):
        lines = wrap_text(str(s), max_units)
        leading = leading or size * 1.45
        for i, line in enumerate(lines):
            self.text(x, y - i * leading, line, size, color)
        return y - len(lines) * leading


def text_units(s):
    total = 0
    for ch in s:
        total += 0.55 if ord(ch) < 128 else 1.0
    return total


def wrap_text(s, max_units):
    lines, buf = [], ""
    for part in s.split("\n"):
        for ch in part:
            if text_units(buf + ch) > max_units and buf:
                lines.append(buf)
                buf = ch
            else:
                buf += ch
        if buf:
            lines.append(buf)
            buf = ""
    return lines or [""]


def header(cv, title, page_no):
    cv.rect(0, 565, 842, 30, fill=(0.06, 0.09, 0.16))
    cv.text(30, 575, title, 12, color=(1, 1, 1))
    cv.text(760, 575, f"Page {page_no}", 10, color=(1, 1, 1))


def footer(cv):
    cv.text(30, 18, "出所: 添付CSV。スコアはCSV内相対評価。投資判断は目論見書・月報・手数料・税制・個人のリスク許容度で確認。", 8, color=(0.36, 0.42, 0.50))


def bar_chart(cv, rows, x, y, w, h, value_key, title, color=(0.15, 0.39, 0.92), suffix="", max_value=None):
    cv.text(x, y + h + 14, title, 13, color=(0.05, 0.09, 0.16))
    max_value = max_value or max([r.get(value_key + "_num") if value_key + "_num" in r else r.get(value_key) for r in rows] + [1])
    row_h = h / max(len(rows), 1)
    for i, r in enumerate(rows):
        yy = y + h - (i + 1) * row_h + 3
        val = r.get(value_key + "_num") if value_key + "_num" in r else r.get(value_key)
        val = val or 0
        cv.text(x, yy + 3, f"{int(r.get('総合順位_num') or i+1)}. {r['short'][:20]}", 8)
        bx = x + 175
        bw = max(1, (w - 250) * val / max_value) if max_value else 1
        cv.rect(bx, yy, w - 250, 9, fill=(0.92, 0.95, 1.0))
        cv.rect(bx, yy, bw, 9, fill=color)
        cv.text(bx + w - 240, yy + 1, f"{val:,.1f}{suffix}", 8)


def scatter(cv, rows, x, y, w, h):
    cv.text(x, y + h + 14, "リスク×リターン: 横軸=標準偏差、縦軸=1年TR、円の大きさ=純資産", 13)
    pts = [(r, r.get("標準偏差（σ-シグマ）（1年）_num"), r.get("トータルリターン(1年)_num")) for r in rows]
    pts = [(r, sx, sy) for r, sx, sy in pts if sx is not None and sy is not None]
    if not pts:
        cv.text(x, y + h / 2, "散布図に必要なデータがありません", 10)
        return
    xs = [p[1] for p in pts]
    ys = [p[2] for p in pts]
    xmin, xmax = min(xs) * 0.95, max(xs) * 1.05
    ymin, ymax = min(ys) * 0.90, max(ys) * 1.05
    cv.rect(x, y, w, h, fill=(1, 1, 1), stroke=(0.75, 0.80, 0.86))
    for i in range(6):
        gx = x + w * i / 5
        gy = y + h * i / 5
        cv.line(gx, y, gx, y + h, color=(0.90, 0.93, 0.96))
        cv.line(x, gy, x + w, gy, color=(0.90, 0.93, 0.96))
    max_aum = max((r.get("純資産(百万円)_num") or 1) for r, _, _ in pts)
    for r, sxv, syv in pts:
        px = x + (sxv - xmin) / (xmax - xmin) * w
        py = y + (syv - ymin) / (ymax - ymin) * h
        fee = r.get("信託報酬_num") or 0
        col = (0.09, 0.64, 0.29) if fee <= 0.5 else ((0.96, 0.62, 0.04) if fee <= 1.5 else (0.86, 0.15, 0.15))
        rad = 3 + 8 * math.sqrt((r.get("純資産(百万円)_num") or 1) / max_aum)
        cv.circle(px, py, rad, fill=col)
        cv.text(px + rad + 2, py - 2, r["short"][:12], 6.5)
    cv.text(x, y - 14, "標準偏差（低いほど安定）", 8)
    cv.text(x - 2, y + h + 2, "1年TR", 8)


def table(cv, rows, x, y, col_w, row_h=22, size=7.5):
    headers = ["順位", "ファンド", "総合", "報酬", "純資産", "1年TR", "Sharpe", "sigma", "5年試算"]
    cv.rect(x, y, sum(col_w), row_h, fill=(0.90, 0.95, 1.0))
    xx = x
    for head, cw in zip(headers, col_w):
        cv.text(xx + 3, y + 7, head, size, color=(0.03, 0.16, 0.35))
        xx += cw
    yy = y - row_h
    for r in rows:
        cv.rect(x, yy, sum(col_w), row_h, fill=(1, 1, 1), stroke=(0.88, 0.91, 0.95))
        vals = [
            str(int(r.get("総合順位_num") or 0)),
            r["short"][:22],
            fmt_num(r.get("総合スコア_num"), 1),
            fmt_pct(r.get("信託報酬_num"), 3),
            fmt_num(r.get("純資産(百万円)_num"), 0),
            fmt_pct(r.get("トータルリターン(1年)_num"), 1),
            fmt_num(r.get("シャープレシオ(1年)_num"), 2),
            fmt_pct(r.get("標準偏差（σ-シグマ）（1年）_num"), 1),
            fmt_yen(r.get("5年試算_標準15pct_num")),
        ]
        xx = x
        for val, cw in zip(vals, col_w):
            cv.text(xx + 3, yy + 7, val, size)
            xx += cw
        yy -= row_h


def make_pdf(rows):
    pdf = PDF()

    # Page 1: Executive summary
    cv = Canvas(); header(cv, "半導体関連ファンド比較レポート PDF版", 1)
    cv.text(30, 535, "半導体関連ファンド比較レポート", 24, color=(0.05, 0.16, 0.35))
    cv.text(30, 510, f"対象: {len(rows)}本 / 初期投資: {INITIAL_INVESTMENT:,}円 / 想定保有: 最短5年 / 生成日: {date.today()}", 11)
    cv.rect(30, 440, 780, 48, fill=(1.0, 0.98, 0.90), stroke=(0.95, 0.62, 0.04))
    cv.wrapped(45, 468, "最重要結論: 半導体ファンドは高成長テーマに乗れる一方、標準偏差が高く大きな含み損期間を許容できるサテライト投資向き。200万円を全額1本へ一括投入するより、低コスト上位を軸に分散・段階投入する方が現実的です。", 11, 98)
    top = rows[0]
    cards = [
        ("本スコア上の総合1位", top["short"], f"総合 {fmt_num(top.get('総合スコア_num'),1)} / 報酬 {fmt_pct(top.get('信託報酬_num'),3)}"),
        ("低コスト筆頭", min(rows, key=lambda r: r.get("信託報酬_num") or 99)["short"], "5年以上では費用差が効きやすい"),
        ("純資産最大", max(rows, key=lambda r: r.get("純資産(百万円)_num") or 0)["short"], "運用継続・流動性面の安心感"),
        ("シャープ最高", max(rows, key=lambda r: r.get("シャープレシオ(1年)_num") or -99)["short"], "短期局面依存には注意"),
    ]
    x = 30
    for title, name, note in cards:
        cv.rect(x, 345, 185, 75, fill=(1, 1, 1), stroke=(0.83, 0.87, 0.92))
        cv.text(x+10, 400, title, 9, color=(0.35, 0.42, 0.50))
        cv.wrapped(x+10, 380, name, 14, 13, color=(0.12, 0.31, 0.72))
        cv.wrapped(x+10, 355, note, 8.5, 20)
        x += 200
    cv.wrapped(30, 310, "評価軸: 成長性15%、リスク調整25%、低コスト25%、使いやすさ15%、5年実績20%。直近リターンの外挿を避け、長期保有で効く費用・実績・リスク調整を重視しました。", 10, 110)
    cv.wrapped(30, 260, "注意: 本PDFは添付CSVの数値に基づく比較資料であり、将来収益を保証するものではありません。組入銘柄、為替、実質売買コスト、税制、NISA残枠、既存ポートフォリオとの相関は別途確認が必要です。", 9.5, 112, color=(0.55, 0.22, 0.08))
    footer(cv); pdf.add_page(cv.c)

    # Page 2: score ranking
    cv = Canvas(); header(cv, "総合スコアランキング", 2)
    bar_chart(cv, rows, 40, 90, 760, 400, "総合スコア", "総合スコアランキング（5年運用適性・CSV内相対評価）", max_value=100)
    cv.wrapped(40, 62, "上位は低コスト・NISA対応・一定の実績を持つ商品が有利。直近1年リターンが突出していても、高コストや実績不足は総合評価を抑えています。", 9, 105)
    footer(cv); pdf.add_page(cv.c)

    # Page 3: risk-return scatter
    cv = Canvas(); header(cv, "リスク・リターン分析", 3)
    scatter(cv, rows, 60, 95, 720, 370)
    cv.rect(60, 35, 720, 42, fill=(0.96, 0.98, 1.0), stroke=(0.83, 0.87, 0.92))
    cv.wrapped(72, 60, "読み方: 左上ほど相対的に望ましいが、半導体テーマは全体に値動きが大きい。円の色は信託報酬の目安（緑=低、黄=中、赤=高）です。", 9, 96)
    footer(cv); pdf.add_page(cv.c)

    # Page 4: cost and 5y sensitivity
    cv = Canvas(); header(cv, "コストと5年感応度分析", 4)
    fee_sorted = sorted(rows, key=lambda r: r.get("信託報酬_num") or 99)
    bar_chart(cv, fee_sorted, 40, 330, 760, 145, "信託報酬", "信託報酬率（低いほど長期向き。バーは料率そのもの）", color=(0.58, 0.20, 0.92), suffix="%", max_value=max(r.get("信託報酬_num") or 0 for r in rows))
    scenario_sorted = sorted(rows, key=lambda r: r.get("5年試算_標準15pct_num") or 0, reverse=True)
    bar_chart(cv, scenario_sorted, 40, 95, 760, 175, "5年試算_標準15pct", "200万円・5年の感応度分析: 年率15%仮定・信託報酬控除後（予測ではない）", color=(0.06, 0.46, 0.43), suffix="円", max_value=max(r.get("5年試算_標準15pct_num") or 0 for r in rows))
    cv.wrapped(40, 62, "機械試算は全ファンド同じ年率15%を置いた費用差の感応度です。ファンド固有の将来収益予測ではありません。", 8.5, 110)
    footer(cv); pdf.add_page(cv.c)

    # Page 5: detail table
    cv = Canvas(); header(cv, "詳細ランキング表", 5)
    table(cv, rows, 25, 515, [35, 160, 45, 55, 70, 60, 52, 55, 105], row_h=30, size=7.2)
    cv.wrapped(25, 70, "Sharpeは無単位、sigmaは標準偏差。5年試算は年率15%仮定・信託報酬控除後の感応度で、将来の価格を保証するものではありません。", 8.5, 110)
    footer(cv); pdf.add_page(cv.c)

    # Page 6: review gate and actions
    cv = Canvas(); header(cv, "Review Gate 結果と実務アクション", 6)
    cv.text(40, 530, "Review Gate 結果", 16, color=(0.05, 0.16, 0.35))
    bullets = [
        "py_compileと再実行は成功。元CSV13件と生成CSV13件の整合を確認。",
        "静的確認: 機密値の直書き、危険な外部コマンド実行、動的コード実行、危険な逆シリアライズは検出なし。",
        "独立レビューで検出された重大な品質指摘を修正: スコア説明と実計算の不一致、将来日付の誤表示、Sharpeの%表記、信託報酬チャート表現。",
        "追加改善: 出力先をスクリプト自身のreports配下に固定、必須列チェック、空データエラー、CSV数式注入の軽減を追加。",
    ]
    y = 500
    for b in bullets:
        cv.text(50, y, "・", 10)
        y = cv.wrapped(65, y, b, 10, 95) - 5
    cv.text(40, 330, "200万円投入の考え方", 16, color=(0.05, 0.16, 0.35))
    actions = [
        "守り寄り: 50〜70%を低コスト上位、残りは現金待機または全世界株式など広域分散へ。",
        "攻め寄り: 低コストSOX/日経半導体を主軸に、純資産規模の大きいグローバル型を補助。3〜6回の分割投入でタイミングリスクを下げる。",
        "リバランス: 半導体比率が膨らんだら年1回程度で利益確定・比率調整。5年継続でも放置は避ける。",
    ]
    y = 300
    for a in actions:
        cv.text(50, y, "・", 10)
        y = cv.wrapped(65, y, a, 10, 100) - 5
    footer(cv); pdf.add_page(cv.c)

    pdf.save(PDF_OUT)


if __name__ == "__main__":
    rows = read_rows()
    make_pdf(rows)
    print(f"pdf={PDF_OUT}")
    print(f"pages=6 rows={len(rows)} size={PDF_OUT.stat().st_size}")
