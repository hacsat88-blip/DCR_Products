import csv
import math
import pathlib
import html
from datetime import datetime
from statistics import median

SRC = pathlib.Path(r"C:\Users\hacsa\Downloads\powersearch_20266984310.csv")
# Always write next to this script, regardless of the shell's current directory.
OUTDIR = pathlib.Path(__file__).resolve().parent
HTML_OUT = OUTDIR / "powersearch_semiconductor_fund_report.html"
CSV_OUT = OUTDIR / "powersearch_semiconductor_fund_scored.csv"
INITIAL_INVESTMENT = 2_000_000
REQUIRED_COLS = [
    "協会コード", "ファンド名", "ファンド名略称", "委託会社", "投資地域", "純資産(百万円)",
    "買付手数料", "信託報酬", "トータルリターン(1年)", "シャープレシオ(1年)",
    "標準偏差（σ-シグマ）（1年）"
]

NUM_COLS = [
    "基準価額(円)", "前日比(円)", "前日比率", "設定来高値", "設定来安値", "純資産(百万円)",
    "販売金額ランキング", "買付手数料", "信託報酬", "直近分配金（円）", "年間分配金累計(円)",
    "騰落率(前日比)", "騰落率(前週比)", "騰落率(前月比)", "騰落率(6ヵ月)", "騰落率(1年)", "騰落率(3年)",
    "トータルリターン(6ヵ月)", "トータルリターン(1年)", "トータルリターン(3年)",
    "リスクメジャー(3年)", "シャープレシオ(1年)", "標準偏差（σ-シグマ）（1年）", "ファンドレーティング(総合)"
]
DATE_COLS = ["設定来高値 (日付)", "設定来安値 (日付)", "次回決算日", "設定日", "当社取扱日"]
# 基準価額・リターンの「データ時点」をCSVだけから厳密には特定できない。
# 次回決算日のような将来予定日は除外し、実績系の日付だけを参考表示と設定経過年数に使う。
HISTORICAL_DATE_COLS = ["設定来高値 (日付)", "設定来安値 (日付)", "設定日", "当社取扱日"]

def to_float(v):
    if v is None:
        return None
    s = str(v).strip().replace(",", "")
    if not s or s in {"-", "--", "なし"}:
        return None
    try:
        return float(s)
    except ValueError:
        return None

def parse_date(v):
    if not v:
        return None
    s = str(v).strip()
    for fmt in ("%Y/%m/%d", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None

def fmt_pct(v, digits=2):
    return "—" if v is None else f"{v:.{digits}f}%"

def fmt_num(v, digits=0):
    if v is None:
        return "—"
    return f"{v:,.{digits}f}"

def fmt_yen(v):
    if v is None:
        return "—"
    return f"{round(v):,}円"

def minmax(values, higher=True):
    vals = [v for v in values if v is not None and math.isfinite(v)]
    if not vals:
        return [0.5 for _ in values]
    lo, hi = min(vals), max(vals)
    if abs(hi - lo) < 1e-12:
        return [0.5 if v is not None else 0.4 for v in values]
    out = []
    for v in values:
        if v is None or not math.isfinite(v):
            out.append(0.4)
        else:
            z = (v - lo) / (hi - lo)
            out.append(z if higher else 1 - z)
    return out

def clamp(x, lo, hi):
    return max(lo, min(hi, x))

def short_name(r):
    n = r.get("ファンド名略称") or r.get("ファンド名") or ""
    return n.replace("インデックス", "インデ").replace("ファンド", "F").replace("半導体関連", "半導体")

def safe_csv_cell(v):
    """Prevent spreadsheet formula interpretation when opening the generated CSV."""
    if isinstance(v, str) and v[:1] in {"=", "+", "-", "@"}:
        return "'" + v
    return v

# Read CSV. The first 4 rows are search metadata, then the actual header.
if not SRC.exists():
    raise FileNotFoundError(f"CSV not found: {SRC}")
with SRC.open("r", encoding="utf-8-sig", newline="") as f:
    lines = f.readlines()
reader = csv.DictReader(lines[4:])
missing_cols = [c for c in REQUIRED_COLS if c not in (reader.fieldnames or [])]
if missing_cols:
    raise ValueError(f"Required columns are missing from CSV: {missing_cols}")
rows = list(reader)
if not rows:
    raise ValueError("CSV has no fund rows after the metadata/header section")

# Enrich numeric/date fields.
historical_dates = []
for r in rows:
    for c in NUM_COLS:
        r[c + "_num"] = to_float(r.get(c))
    for c in DATE_COLS:
        d = parse_date(r.get(c))
        r[c + "_date"] = d
        if d and c in HISTORICAL_DATE_COLS:
            historical_dates.append(d)
    r["short"] = short_name(r)

data_date = max(historical_dates) if historical_dates else None
data_date_label = f"CSV内の実績系最新日付: {data_date}" if data_date else "CSV取得日/基準日: CSV内に明示なし"

# Age / history metrics.
for r in rows:
    sd = r.get("設定日_date")
    r["設定経過年数"] = ((data_date - sd).days / 365.25) if (sd and data_date) else None
    tr3 = r.get("トータルリターン(3年)_num")
    r["3年TR年率換算"] = ((1 + tr3 / 100) ** (1 / 3) - 1) * 100 if tr3 is not None and tr3 > -100 else None

# Score components.
tr1 = [r.get("トータルリターン(1年)_num") for r in rows]
tr6 = [r.get("トータルリターン(6ヵ月)_num") for r in rows]
sharpe = [r.get("シャープレシオ(1年)_num") for r in rows]
sigma = [r.get("標準偏差（σ-シグマ）（1年）_num") for r in rows]
fee = [r.get("信託報酬_num") for r in rows]
aum = [r.get("純資産(百万円)_num") for r in rows]
sales_rank = [r.get("販売金額ランキング_num") for r in rows]
age = [r.get("設定経過年数") for r in rows]
rating = [r.get("ファンドレーティング(総合)_num") for r in rows]

tr1_s = minmax(tr1, True)
tr6_s = minmax(tr6, True)
sharpe_s = minmax(sharpe, True)
sigma_s = minmax(sigma, False)
fee_s = minmax(fee, False)
aum_log_s = minmax([math.log10(x + 1) if x is not None else None for x in aum], True)
sales_s = minmax(sales_rank, False)
age_s = minmax(age, True)
rating_s = minmax(rating, True)

med_sigma = median([x for x in sigma if x is not None]) if any(x is not None for x in sigma) else 50.0

for i, r in enumerate(rows):
    has_3y = 1.0 if r.get("トータルリターン(3年)_num") is not None else 0.0
    nisa_growth = 1.0 if r.get("NISA (成長投資枠)") == "〇" else 0.0
    tsumitate = 1.0 if r.get("NISA (つみたて投資枠)") == "〇" else 0.0
    inflow = 1.0 if r.get("3ヵ月連続流入") == "〇" else 0.0
    return_score = 100 * (0.70 * tr1_s[i] + 0.30 * tr6_s[i])
    risk_score = 100 * (0.70 * sharpe_s[i] + 0.30 * sigma_s[i])
    # 欠損値が多いファンドは「良い/悪い」ではなく、判断材料不足として控えめに評価する。
    if r.get("トータルリターン(1年)_num") is None:
        return_score *= 0.65
    if r.get("シャープレシオ(1年)_num") is None or r.get("標準偏差（σ-シグマ）（1年）_num") is None:
        risk_score = min(risk_score, 25.0)
    cost_score = 100 * fee_s[i]
    usability_score = 100 * (0.55 * aum_log_s[i] + 0.25 * nisa_growth + 0.10 * tsumitate + 0.10 * sales_s[i])
    track_score = 100 * (0.45 * has_3y + 0.25 * rating_s[i] + 0.20 * age_s[i] + 0.10 * inflow)
    # 5年以上の長期保有では、直近リターンの外挿よりも「低コスト」「実績」「リスク調整」を重視する。
    # 成長性は重要だが、半導体テーマの直近1年成績は過熱局面を含みやすいため15%に抑える。
    overall = 0.15 * return_score + 0.25 * risk_score + 0.25 * cost_score + 0.15 * usability_score + 0.20 * track_score
    r["成長性スコア"] = return_score
    r["リスク調整スコア"] = risk_score
    r["低コストスコア"] = cost_score
    r["使いやすさスコア"] = usability_score
    r["5年実績スコア"] = track_score
    r["総合スコア"] = overall

# Sort and rank.
ranked = sorted(rows, key=lambda r: r["総合スコア"], reverse=True)
for idx, r in enumerate(ranked, 1):
    r["総合順位"] = idx

# Scenario: not forecast; shows 5-year sensitivity from fee and volatility.
BASE_GROSS = 0.15
UP_GROSS = 0.30
for r in rows:
    f = (r.get("信託報酬_num") or 0) / 100
    sig = (r.get("標準偏差（σ-シグマ）（1年）_num") or med_sigma) / 100
    neutral = INITIAL_INVESTMENT * ((1 + BASE_GROSS - f) ** 5)
    upside = INITIAL_INVESTMENT * ((1 + UP_GROSS - f) ** 5)
    # One severe first-year drawdown equal to 1-year sigma, then 4 years of base recovery.
    stress = INITIAL_INVESTMENT * max(0, (1 - sig)) * ((1 + BASE_GROSS - f) ** 4)
    no_fee = INITIAL_INVESTMENT * ((1 + BASE_GROSS) ** 5)
    fee_drag = no_fee - neutral
    r["5年試算_標準15pct"] = neutral
    r["5年試算_強気30pct"] = upside
    r["5年試算_1σ下落後回復"] = stress
    r["5年信託報酬影響額_15pct前提"] = fee_drag

# Feature pros/cons.
q = {}
for key in ["トータルリターン(1年)_num", "シャープレシオ(1年)_num", "標準偏差（σ-シグマ）（1年）_num", "純資産(百万円)_num", "信託報酬_num"]:
    vals = sorted([r.get(key) for r in rows if r.get(key) is not None])
    if vals:
        q[key] = {
            "q1": vals[max(0, int((len(vals)-1)*0.25))],
            "q3": vals[min(len(vals)-1, int((len(vals)-1)*0.75))]
        }

def pros_cons(r):
    pros, cons = [], []
    feev = r.get("信託報酬_num")
    tr1v = r.get("トータルリターン(1年)_num")
    sharpv = r.get("シャープレシオ(1年)_num")
    sigv = r.get("標準偏差（σ-シグマ）（1年）_num")
    aumv = r.get("純資産(百万円)_num")
    if feev is not None and feev <= 0.33:
        pros.append("低コスト（信託報酬0.33%以下）")
    if tr1v is not None and tr1v >= q.get("トータルリターン(1年)_num", {}).get("q3", 10**9):
        pros.append("直近1年リターンが上位")
    if sharpv is not None and sharpv >= q.get("シャープレシオ(1年)_num", {}).get("q3", 10**9):
        pros.append("リスク対比の効率が高い")
    if sigv is not None and sigv <= q.get("標準偏差（σ-シグマ）（1年）_num", {}).get("q1", -1):
        pros.append("比較内では値動きが相対的に抑えめ")
    if aumv is not None and aumv >= q.get("純資産(百万円)_num", {}).get("q3", 10**18):
        pros.append("純資産が大きく運用継続面で安心感")
    if r.get("トータルリターン(3年)_num") is not None:
        pros.append("3年実績データあり")
    if r.get("ファンドレーティング(総合)_num") == 5:
        pros.append("総合レーティング5")
    if r.get("3ヵ月連続流入") == "〇":
        pros.append("資金流入が継続")
    if feev is not None and feev >= 1.5:
        cons.append("信託報酬が高く5年以上ではコスト差が効く")
    if sigv is not None and sigv >= q.get("標準偏差（σ-シグマ）（1年）_num", {}).get("q3", -1):
        cons.append("ボラティリティが高い")
    if r.get("トータルリターン(3年)_num") is None:
        cons.append("3年実績が未確認で長期評価は不確実")
    if aumv is not None and aumv < 10_000:
        cons.append("純資産が小さめ")
    sr = r.get("販売金額ランキング_num")
    if sr is None or sr > 100:
        cons.append("販売ランキング面の勢いは限定的/不明")
    if r.get("投資地域") in {"日本", "北米"}:
        cons.append(f"地域集中（{r.get('投資地域')}）")
    else:
        cons.append("半導体テーマ集中で景気・金利・AI投資循環に敏感")
    return pros[:5], cons[:5]

for r in rows:
    r["pros"], r["cons"] = pros_cons(r)

# SVG helpers.
def svg_bar_chart(data, title, value_key, max_value=None, width=980, row_h=30, color="#3b82f6", suffix=""):
    data = list(data)
    max_value = max_value if max_value is not None else max([d[value_key] for d in data] + [1])
    h = 70 + len(data) * row_h
    parts = [f'<svg viewBox="0 0 {width} {h}" role="img" aria-label="{html.escape(title)}">',
             f'<text x="10" y="24" font-size="18" font-weight="700">{html.escape(title)}</text>']
    x0, label_w, bar_w = 260, 350, width - 430
    for i, d in enumerate(data):
        y = 52 + i * row_h
        val = d[value_key] or 0
        bw = 0 if max_value == 0 else max(2, bar_w * val / max_value)
        parts.append(f'<text x="10" y="{y+16}" font-size="12">{html.escape(str(d["総合順位"]) + ". " + d["short"][:30])}</text>')
        parts.append(f'<rect x="{x0}" y="{y}" width="{bar_w}" height="18" fill="#eef2ff" rx="4"/>')
        parts.append(f'<rect x="{x0}" y="{y}" width="{bw:.1f}" height="18" fill="{color}" rx="4"/>')
        parts.append(f'<text x="{x0+bar_w+8}" y="{y+14}" font-size="12" font-weight="600">{val:,.1f}{suffix}</text>')
    parts.append('</svg>')
    return "".join(parts)

def svg_scatter(data, title, width=980, height=520):
    xs = [d.get("標準偏差（σ-シグマ）（1年）_num") for d in data if d.get("標準偏差（σ-シグマ）（1年）_num") is not None]
    ys = [d.get("トータルリターン(1年)_num") for d in data if d.get("トータルリターン(1年)_num") is not None]
    if not xs or not ys:
        return ""
    xmin, xmax = min(xs)*0.95, max(xs)*1.05
    ymin, ymax = min(ys)*0.90, max(ys)*1.05
    pad_l, pad_r, pad_t, pad_b = 70, 30, 55, 70
    plot_w, plot_h = width - pad_l - pad_r, height - pad_t - pad_b
    def sx(x): return pad_l + (x - xmin) / (xmax - xmin) * plot_w
    def sy(y): return pad_t + (ymax - y) / (ymax - ymin) * plot_h
    parts = [f'<svg viewBox="0 0 {width} {height}" role="img" aria-label="{html.escape(title)}">',
             f'<text x="10" y="24" font-size="18" font-weight="700">{html.escape(title)}</text>',
             f'<rect x="{pad_l}" y="{pad_t}" width="{plot_w}" height="{plot_h}" fill="#ffffff" stroke="#cbd5e1"/>']
    # grid
    for i in range(6):
        gx = pad_l + plot_w*i/5
        gy = pad_t + plot_h*i/5
        parts.append(f'<line x1="{gx}" y1="{pad_t}" x2="{gx}" y2="{pad_t+plot_h}" stroke="#eef2f7"/>')
        parts.append(f'<line x1="{pad_l}" y1="{gy}" x2="{pad_l+plot_w}" y2="{gy}" stroke="#eef2f7"/>')
    parts.append(f'<text x="{pad_l+plot_w/2-70}" y="{height-20}" font-size="13">標準偏差（低いほど安定）</text>')
    parts.append(f'<text x="10" y="{pad_t+plot_h/2}" transform="rotate(-90 18,{pad_t+plot_h/2})" font-size="13">1年総リターン</text>')
    max_aum = max([d.get("純資産(百万円)_num") or 1 for d in data])
    for d in data:
        x = d.get("標準偏差（σ-シグマ）（1年）_num")
        y = d.get("トータルリターン(1年)_num")
        if x is None or y is None:
            continue
        a = d.get("純資産(百万円)_num") or 1
        feev = d.get("信託報酬_num") or 0
        radius = 5 + 15 * math.sqrt(a / max_aum)
        color = "#16a34a" if feev <= 0.5 else ("#f59e0b" if feev <= 1.5 else "#dc2626")
        cx, cy = sx(x), sy(y)
        parts.append(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{radius:.1f}" fill="{color}" opacity="0.70"><title>{html.escape(d["short"])} / σ {x:.1f}% / TR1Y {y:.1f}% / fee {feev:.3f}%</title></circle>')
        parts.append(f'<text x="{cx+radius+3:.1f}" y="{cy+4:.1f}" font-size="10">{html.escape(d["short"][:14])}</text>')
    parts.append('<text x="710" y="45" font-size="12"><tspan fill="#16a34a">●低コスト</tspan> <tspan fill="#f59e0b">●中</tspan> <tspan fill="#dc2626">●高コスト</tspan> / 円の大きさ=純資産</text>')
    parts.append('</svg>')
    return "".join(parts)

def component_bar(r):
    comps = [("成長", r["成長性スコア"], "#2563eb"), ("効率", r["リスク調整スコア"], "#16a34a"), ("費用", r["低コストスコア"], "#9333ea"), ("使勝", r["使いやすさスコア"], "#f59e0b"), ("実績", r["5年実績スコア"], "#ef4444")]
    spans = []
    for name, val, color in comps:
        spans.append(f'<span title="{name}:{val:.1f}" style="display:inline-block;width:{max(4,val):.1f}px;height:8px;background:{color};border-radius:4px;margin-right:2px"></span>')
    return ''.join(spans)

# Write scored CSV.
fieldnames = ["総合順位", "総合スコア", "成長性スコア", "リスク調整スコア", "低コストスコア", "使いやすさスコア", "5年実績スコア", "5年試算_標準15pct", "5年試算_1σ下落後回復", "5年試算_強気30pct", "5年信託報酬影響額_15pct前提"] + reader.fieldnames
with CSV_OUT.open("w", encoding="utf-8-sig", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
    w.writeheader()
    for r in sorted(rows, key=lambda x: x["総合順位"]):
        out = {k: r.get(k, "") for k in fieldnames}
        for k in fieldnames:
            if isinstance(out.get(k), float):
                out[k] = f"{out[k]:.6f}"
            else:
                out[k] = safe_csv_cell(out.get(k, ""))
        w.writerow(out)

# HTML.
rank_table_rows = []
for r in ranked:
    pros = ''.join(f'<li>{html.escape(x)}</li>' for x in r["pros"])
    cons = ''.join(f'<li>{html.escape(x)}</li>' for x in r["cons"])
    rank_table_rows.append(f"""
    <tr>
      <td class="rank">{r['総合順位']}</td>
      <td><b>{html.escape(r['short'])}</b><br><span class="muted">{html.escape(r.get('委託会社',''))} / {html.escape(r.get('投資地域',''))} / {'インデックス' if r.get('インデックス対象')=='〇' else 'アクティブ/その他'}</span></td>
      <td class="num"><b>{r['総合スコア']:.1f}</b><br>{component_bar(r)}</td>
      <td class="num">{fmt_pct(r.get('信託報酬_num'),3)}</td>
      <td class="num">{fmt_num(r.get('純資産(百万円)_num'),0)}百万円</td>
      <td class="num">{fmt_pct(r.get('トータルリターン(1年)_num'))}</td>
      <td class="num">{fmt_num(r.get('シャープレシオ(1年)_num'),2)}</td>
      <td class="num">{fmt_pct(r.get('標準偏差（σ-シグマ）（1年）_num'))}</td>
      <td class="num">{fmt_yen(r.get('5年試算_標準15pct'))}<br><span class="muted">ストレス {fmt_yen(r.get('5年試算_1σ下落後回復'))}</span></td>
      <td><div class="pc"><b>メリット</b><ul>{pros}</ul><b>デメリット</b><ul>{cons}</ul></div></td>
    </tr>""")

cards = []
for r in ranked[:5]:
    cards.append(f"""
    <div class="card topcard">
      <div class="badge">#{r['総合順位']}</div>
      <h3>{html.escape(r['short'])}</h3>
      <p class="muted">総合 {r['総合スコア']:.1f} / 信託報酬 {fmt_pct(r.get('信託報酬_num'),3)} / 1年TR {fmt_pct(r.get('トータルリターン(1年)_num'))}</p>
      <p><b>向く人:</b> {html.escape('低コスト重視' if r.get('信託報酬_num',9)<=0.5 else '勢い・純資産規模重視')}</p>
      <p><b>注意:</b> {html.escape(r['cons'][0] if r['cons'] else '半導体テーマ集中リスク')}</p>
    </div>
    """)

score_chart = svg_bar_chart(ranked, "総合スコアランキング（5年運用適性・CSV内相対評価）", "総合スコア", max_value=100, color="#2563eb")
fee_chart = svg_bar_chart(sorted(rows, key=lambda r: r.get("信託報酬_num") or 99), "信託報酬率（低いほど長期向き。バーは料率そのもの）", "信託報酬_num", max_value=max([r.get("信託報酬_num") or 0 for r in rows]), color="#9333ea", suffix="%")
scenario_chart = svg_bar_chart(sorted(rows, key=lambda r: r.get("5年試算_標準15pct") or 0, reverse=True), "200万円・5年の感応度分析：年率15%仮定・信託報酬控除後（予測ではない）", "5年試算_標準15pct", color="#0f766e", suffix="円")
scatter = svg_scatter(rows, "リスク×リターン散布図：右上ほど高リターンだが高変動")

summary_top = ranked[0]
low_cost_best = sorted(rows, key=lambda r: (r.get("信託報酬_num") if r.get("信託報酬_num") is not None else 99, -r["総合スコア"]))[0]
high_aum_best = sorted(rows, key=lambda r: r.get("純資産(百万円)_num") or 0, reverse=True)[0]
sharpe_best = sorted(rows, key=lambda r: r.get("シャープレシオ(1年)_num") or -99, reverse=True)[0]

html_doc = f"""<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>半導体関連ファンド比較レポート</title>
<style>
:root {{ --fg:#0f172a; --muted:#64748b; --line:#e2e8f0; --bg:#f8fafc; --card:#fff; --accent:#2563eb; }}
* {{ box-sizing: border-box; }}
body {{ margin:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans JP', 'Hiragino Sans', Meiryo, sans-serif; color:var(--fg); background:var(--bg); line-height:1.65; }}
header {{ background:linear-gradient(135deg,#0f172a,#1d4ed8); color:white; padding:34px 40px; }}
header h1 {{ margin:0 0 8px; font-size:30px; }}
header p {{ margin:4px 0; color:#dbeafe; }}
main {{ padding:28px 40px 60px; max-width:1280px; margin:auto; }}
.card {{ background:var(--card); border:1px solid var(--line); border-radius:16px; padding:18px; box-shadow:0 8px 22px rgba(15,23,42,.05); }}
.grid {{ display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap:16px; margin:18px 0; }}
.grid3 {{ display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:16px; margin:18px 0; }}
.topgrid {{ display:grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap:14px; margin:18px 0; }}
.kpi {{ font-size:28px; font-weight:800; color:#1d4ed8; }}
.muted {{ color:var(--muted); font-size:12px; }}
.badge {{ display:inline-block; background:#dbeafe; color:#1e40af; border-radius:999px; padding:3px 10px; font-weight:800; }}
.warn {{ border-left:5px solid #f59e0b; background:#fffbeb; padding:12px 16px; border-radius:12px; }}
.good {{ border-left:5px solid #16a34a; background:#f0fdf4; padding:12px 16px; border-radius:12px; }}
.bad {{ border-left:5px solid #dc2626; background:#fef2f2; padding:12px 16px; border-radius:12px; }}
svg {{ width:100%; height:auto; background:white; border:1px solid var(--line); border-radius:14px; margin:14px 0; }}
table {{ width:100%; border-collapse:collapse; background:white; border-radius:14px; overflow:hidden; font-size:13px; }}
th, td {{ border-bottom:1px solid var(--line); padding:10px 9px; vertical-align:top; }}
th {{ position:sticky; top:0; background:#eff6ff; z-index:1; text-align:left; }}
.num {{ text-align:right; white-space:nowrap; }}
.rank {{ font-size:20px; font-weight:900; color:#1d4ed8; text-align:center; }}
.pc ul {{ margin:3px 0 8px 18px; padding:0; }}
section {{ margin:26px 0; }}
h2 {{ border-bottom:2px solid #bfdbfe; padding-bottom:6px; margin-top:28px; }}
.small {{ font-size:12px; }}
@media (max-width: 1000px) {{ .grid,.grid3,.topgrid {{ grid-template-columns:1fr; }} main, header {{ padding-left:18px; padding-right:18px; }} table {{ font-size:12px; }} }}
</style>
</head>
<body>
<header>
  <h1>半導体関連ファンド比較レポート</h1>
  <p>CSV: {html.escape(SRC.name)} / 対象 {len(rows)}本 / {html.escape(data_date_label)} / 初期投資: {INITIAL_INVESTMENT:,}円 / 想定保有: 最短5年</p>
  <p>注意: 本レポートは添付CSVの数値に基づく比較資料であり、将来収益を保証するものではありません。</p>
</header>
<main>
<section class="warn">
  <b>最重要結論:</b> 半導体ファンドは直近成績が非常に強い一方、標準偏差が概ね35〜55%台と高く、5年以上でも大きな含み損期間を許容できるサテライト投資向きです。200万円を全額1本に入れるより、低コスト上位を軸に分散・段階投入する方が手戻りを抑えやすいです。
</section>

<section>
<h2>1. 総合判断</h2>
<div class="grid">
  <div class="card"><div class="muted">本スコア上の総合1位</div><div class="kpi">{html.escape(summary_top['short'])}</div><p>低コスト・3年実績・レーティングのバランスが本CSV内では良好。</p></div>
  <div class="card"><div class="muted">低コスト筆頭</div><div class="kpi">{html.escape(low_cost_best['short'])}</div><p>信託報酬 {fmt_pct(low_cost_best.get('信託報酬_num'),3)}。5年超では費用差が効く。</p></div>
  <div class="card"><div class="muted">純資産最大</div><div class="kpi">{html.escape(high_aum_best['short'])}</div><p>{fmt_num(high_aum_best.get('純資産(百万円)_num'),0)}百万円。運用継続・流動性面で安心感。</p></div>
  <div class="card"><div class="muted">シャープレシオ最高</div><div class="kpi">{html.escape(sharpe_best['short'])}</div><p>1年シャープ {fmt_num(sharpe_best.get('シャープレシオ(1年)_num'),2)}。ただし短期局面依存。</p></div>
</div>
<div class="topgrid">{''.join(cards)}</div>
</section>

<section>
<h2>2. スコアリング設計</h2>
<div class="card">
<p>5年運用を前提に、CSV内の相対評価として以下の重みで総合スコア化しました。</p>
<ul>
<li><b>成長性 15%</b>: 1年・6ヵ月トータルリターン</li>
<li><b>リスク調整 25%</b>: シャープレシオ、標準偏差の低さ</li>
<li><b>低コスト 25%</b>: 信託報酬の低さ（買付手数料は全件0%）</li>
<li><b>使いやすさ 15%</b>: 純資産規模、NISA成長投資枠、販売ランキング</li>
<li><b>5年実績 20%</b>: 3年実績・レーティング・設定経過年数・資金流入</li>
</ul>
<p class="muted">欠損値は過度に有利にならないよう中立〜やや保守的に扱っています。設定から間もないファンドは直近成績が良くても長期実績スコアで控えめになります。</p>
</div>
{score_chart}
</section>

<section>
<h2>3. リスク・リターンとコスト</h2>
{scatter}
<div class="grid3">
  <div class="card good"><b>メリット</b><br>半導体・AI・データセンター・先端製造装置など長期テーマに乗れる。インデックス型は低コストで透明性が高い。</div>
  <div class="card warn"><b>注意点</b><br>テーマ集中、景気循環、米国金利、在庫サイクル、特定大型株依存で大きく下落しやすい。</div>
  <div class="card bad"><b>200万円投入時の論点</b><br>一括投資はタイミングリスクが大きい。5年でも-30〜-50%級の一時下落を想定し、分割投入の検討余地が大きい。</div>
</div>
{fee_chart}
</section>

<section>
<h2>4. 200万円・5年の機械試算</h2>
<div class="card">
<p><b>標準試算:</b> 年率15%で5年運用し、各ファンドの信託報酬だけを控除した場合。<b>ストレス試算:</b> 初年度に各ファンドの1年標準偏差相当の下落を受け、その後4年は年率15%で回復した場合。<b>強気試算:</b> 年率30%。</p>
<p class="muted">これは予測ではなく、費用差とボラティリティ耐性を見やすくするための感応度分析です。半導体ファンドの直近1年リターンは非常に高く、単純外挿は危険です。</p>
</div>
{scenario_chart}
</section>

<section>
<h2>5. 詳細ランキング・各商品の特徴</h2>
<table>
<thead>
<tr>
<th>順位</th><th>ファンド</th><th>総合/内訳</th><th>信託報酬</th><th>純資産</th><th>1年TR</th><th>Sharpe</th><th>σ</th><th>5年試算</th><th>特徴・メリット/デメリット</th>
</tr>
</thead>
<tbody>
{''.join(rank_table_rows)}
</tbody>
</table>
</section>

<section>
<h2>6. 実務的な使い分け案</h2>
<div class="grid3">
  <div class="card"><h3>コスト重視・長期保有</h3><p><b>候補:</b> {html.escape(low_cost_best['short'])}</p><p>信託報酬差は5年以上で効くため、基本は低コスト型を軸にするのが合理的。</p></div>
  <div class="card"><h3>規模・実績重視</h3><p><b>候補:</b> {html.escape(high_aum_best['short'])}</p><p>純資産規模が大きい商品は、運用継続や売買の安心感で優位。ただし高コストなら補助的に。</p></div>
  <div class="card"><h3>日本半導体に寄せたい</h3><p><b>候補:</b> eMAXIS 日経半導体インデ / 野村インデ日経半導体株</p><p>国内半導体・装置株への寄せに向く一方、日本集中のため米国SOXとは値動きが異なる。</p></div>
</div>
<div class="card">
<h3>200万円の投入方針例</h3>
<ul>
<li><b>守り寄り:</b> 50〜70%を低コスト上位、残りは現金待機または全世界株式等の広域分散へ。半導体単独への全額集中は避ける。</li>
<li><b>攻め寄り:</b> 低コストSOX/日経半導体を主軸に、純資産規模の大きいグローバル型を補助。3〜6回の分割投入でタイミングリスクを下げる。</li>
<li><b>リバランス:</b> 半導体比率が膨らんだら年1回程度で利益確定・比率調整。5年継続でも「放置」ではなくリスク点検が必要。</li>
</ul>
</div>
</section>

<section>
<h2>7. 制約・未確定点</h2>
<ul>
<li>CSV時点で3年トータルリターンがあるのは一部のみ。若いファンドの長期評価は不確実です。</li>
<li>為替ヘッジ、組入上位銘柄、実質売買コスト、税制、NISA残枠、既存ポートフォリオとの相関はCSVだけでは十分に評価できません。</li>
<li>半導体テーマは高成長と高ボラティリティがセットです。生活防衛資金や全体資産配分を先に確認してください。</li>
</ul>
</section>

<footer class="muted small">
生成物: {html.escape(str(HTML_OUT))} / {html.escape(str(CSV_OUT))}<br>
スコアは添付CSV内の相対比較。投資判断は最終的に目論見書・月報・手数料・税制・個人のリスク許容度で確認してください。
</footer>
</main>
</body>
</html>
"""

HTML_OUT.write_text(html_doc, encoding="utf-8")

print(f"rows={len(rows)}")
print(f"html={HTML_OUT.resolve()}")
print(f"csv={CSV_OUT.resolve()}")
print("top5:")
for r in ranked[:5]:
    print(f"{r['総合順位']}. {r['short']} score={r['総合スコア']:.1f} fee={r.get('信託報酬_num')} tr1={r.get('トータルリターン(1年)_num')} sigma={r.get('標準偏差（σ-シグマ）（1年）_num')}")
