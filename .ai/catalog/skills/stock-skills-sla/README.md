# Stock Skills SLA — Scenario Lens × Agentic

> 投資判断を代行せず、判断材料を「見える化」するAI投資アシスタント。
> stock_skills_2 の Agentic AI Pattern に「銘柄シナリオ・レンズ v1.0」の分析品質契約を統合した Claude Code スキル。

---

## 特徴

- **自然言語で動作**: 「いい株ある？」「トヨタどう？」「PF大丈夫？」だけで起動
- **7エージェント自律協調**: screener / analyst / researcher / health-checker / strategist / risk-assessor / reviewer
- **分析品質契約**: 源タグ4種（[E]/[W]/[L]/[?]）・Fact/推定/仮説/Unknown 厳密分離・禁止語スキャン
- **EDINET MCP ネイティブ対応**: 有報テキスト・財務数値を直接取得（縮退モードあり）
- **期間別3シナリオ**: 上振れ/中立/下振れ × 信頼度 × 根拠強度 A/B/C
- **Conviction × Scenario 二重ロック**: thesis 銘柄への売却を構造的にガード

---

## インストール

### 前提

- Claude Code（Anthropic Claude Code CLI）が利用可能なこと
- EDINET MCP サーバーが設定済みであること（なくても縮退モードで動作）

### スキル配置

```
.claude/
└── skills/
    └── stock-skills-sla/    ← このディレクトリを丸ごとコピー
        ├── SKILL.md
        ├── routing.yaml
        ├── orchestration.yaml
        ├── contracts/
        ├── agents/
        └── data/            ← 初回は下記「初期セットアップ」を参照
```

Claude Code の skills ディレクトリにコピーするか、シンボリックリンクを張ってください。

---

## 初期セットアップ

### 1. data/ ディレクトリを作成

```
data/
├── portfolio.csv          ← 保有銘柄（コピー後に編集）
├── notes/
│   ├── lesson_*.json      ← 過去の学習メモ（任意）
│   ├── thesis_*.json      ← 銘柄別投資仮説（任意）
│   └── observation_*.json ← 観察メモ（任意）
├── screening_results/     ← 自動生成
├── history/               ← 自動生成
└── watchlists/            ← 自動生成
```

### 2. portfolio.csv を作成

`data/portfolio.csv.example` をコピーして編集してください:

```bash
cp data/portfolio.csv.example data/portfolio.csv
```

フォーマット:
```csv
symbol,name,shares,cost_basis,currency
7203.T,トヨタ自動車,100,2500,JPY
AMZN,Amazon.com,5,3000,USD
```

- `symbol`: 証券コード（日本株は `.T` 付き、米株はティッカー）
- `cost_basis`: 1株あたりの取得単価（通貨は `currency` カラムで指定）

### 3. （任意）lesson / thesis ファイルを作成

- `data/notes/lesson_example.json` を参考に過去の投資教訓を記録し、`lesson_<任意ID>.json` で保存
- `data/notes/thesis_example.json` を参考に保有理由を記録し、**ファイル名は必ず `thesis_<symbol>.json`** の形式で保存すること
  - 例: トヨタ(7203.T) → `thesis_7203.T.json`、Amazon(AMZN) → `thesis_AMZN.json`
  - ⚠️ `thesis_example.json` のままだと、オーケストレーターがシンボルで解決できず α8・Conviction ロックが動作しません
- 登録するほど戦略エージェントの判断精度が上がります

---

## 使い方

Claude Code で `/stock-skills-sla` を呼び出すか、スキル起動後に自然言語で入力します。

### 例文

| やりたいこと | 入力例 |
|---|---|
| PF全体を確認 | 「PF大丈夫？」「ヘルスチェックして」 |
| 個別株を分析 | 「7203.T 分析して」「トヨタ 5年目線で」 |
| 割安成長株を探す | 「テンバガー候補教えて」「割安成長株 5年目線で10社」|
| 市場リスクを確認 | 「今の地合いは？」「VIX教えて」 |
| 入替を検討 | 「ソフトバンクG を売って〇〇を買うとどうなる？」 |
| 深掘り | 「9984.T を詳しく。IR含めて調べて」 |
| 月次サーベイ | 「月次シナリオ・レンズ・サーベイを実行して」 |

---

## アーキテクチャ概要

```
SKILL.md（オーケストレーター）
 ├─ routing.yaml         — 自然言語意図 → エージェント振分け
 ├─ orchestration.yaml   — Reviewer制御・Convergence Gate定義
 └─ contracts/           — 全エージェント共通の分析品質契約
     ├─ safety-protocol.md        禁止語・判定ラベル限定
     ├─ evidence-protocol.md      源タグ・Fact/推定/仮説分離
     ├─ scenario-protocol.md      3シナリオ構造
     ├─ horizon-weights.yaml      期間別スコアウェイト
     ├─ scoring-5axis.yaml        5軸スコア定義
     ├─ value-growth-scoring.yaml 割安成長株スコア
     ├─ trigger-checks.yaml       追加チェック発火条件
     └─ failure-matrix.md         失敗時対応表・Convergence Gate

Agents（7体）
 ├─ screener       候補銘柄の探索・スクリーニング
 ├─ analyst        深掘り分析・5軸スコア・3シナリオ生成
 ├─ researcher     ニュース・IR・EDINET テキスト調査
 ├─ health-checker PF数値の事実確認（判断なし）
 ├─ strategist     統合レコメンド・What-If シミュレーション
 ├─ risk-assessor  市場リスク判定・地合い確認
 └─ reviewer       禁止語スキャン・源タグ監査・整合チェック
```

### 契約注入フロー

オーケストレーターはエージェントを起動する前に、必ず契約ファイルを Read して prompt に注入します。
エージェント個別の Read は不要（注入済み）。

---

## +α 機能一覧

| # | 機能 | 状態 |
|---|---|---|
| α1 | Citation Bridge（源タグ → Layer 5 自動マップ） | ✅ 実装済 |
| α2 | Convergence Gate（禁止語スキャナ） | ✅ 実装済 |
| α3 | Lesson ↔ 下振れトリガー リンク | ✅ 実装済 |
| α4 | Conviction × Scenario 二重ロック | ✅ 実装済 |
| α5 | Mode × Horizon 行列（自動パラメータ切替） | ✅ 部分実装 |
| α6 | Unknown Budget（推定軸閾値） | ⏳ 将来実装 |
| α7 | Preflight + EDINET 診断 | ✅ 実装済 |
| α8 | Holdings × Thesis 整合チェック | ✅ 実装済 |
| α9 | Output Snippet 可搬性（Slack/Notion 対応） | ✅ 部分実装 |
| α10 | 月次シナリオ・レンズ・サーベイ | ✅ 実装済 |

---

## 出力の読み方

### 冒頭シグナル

| シグナル | 意味 |
|---|---|
| `🟢[Go]` | 分析可能、重大懸念なし |
| `🟡[Fix]` | データ不足または縮退中 |
| `🔴[Stop]` | 重大リスク（VIX急騰・財務崩壊等） |

### 判定ラベル（この3種のみ）

| ラベル | 意味 |
|---|---|
| `🟢監視継続候補` | 分析可能、重大懸念なし |
| `🟡要確認` | データ不足または注意点あり |
| `🔴要警戒` | 重大リスク、慎重な対応が必要 |

### 源タグ

| タグ | ソース |
|---|---|
| `[E]` | EDINET MCP（有報・財務DB） |
| `[W]` | web_search（株価・IR・ニュース） |
| `[L]` | LLM記憶（数値・株価・制度では使用禁止） |
| `[?]` | 取得不能・Unknown |

---

## 免責事項

本スキルは情報提供・教育目的のみです。
特定銘柄の購入・売却・保有継続を推奨または命令するものではありません。
投資判断は自己責任で行い、必要に応じて金融の専門家に相談してください。
