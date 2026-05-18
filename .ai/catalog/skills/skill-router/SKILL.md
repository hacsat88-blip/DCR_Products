---
name: skill-router
description: '[DEPRECATED — superseded by unified-router module] スキル選定・委譲報告のルーター責務は .ai/module/unified-router.md（pied-piper agentが参照）に統合刷新されました。本スキルは alias 期間中のみ存在します。'
deprecated: true
successor: unified-router
deprecation_reason: B-2 ルーティング層刷新。skill単位ではなくRule+Skill+Agent横断のmodule層に格上げ
---

> **DEPRECATED**: このスキルは [.ai/module/unified-router.md](../../../module/unified-router.md) と [pied-piper](../../agents-source/pied-piper.md) agent に統合刷新されました。新規参照には統一Coordinator経由で利用してください。

---

# Skill Router (legacy)


# Skill Router

タスクに最適なスキル/エージェントを選定し、Transparency for delegation に則って候補提示し、必要な承認後に発火する旧ルーター。

## オーケストレーション方針

- 方式はハイブリッド: 中分類ルーティング（親） + 個別スキル実行（子）
- 親で候補を絞り、最終的には子スキルを選定して承認後に発火する
- 個別実行は常時許可: `/skill-name` の直接呼び出しを禁止しない
- 互換性優先: 既存のスキル名を維持し、導線のみ整理する

## 動作フロー

1. ユーザーのタスクを分析する
2. 下記インデックスからマッチするスキル/エージェントを特定する
3. **発火前に以下のフォーマットで報告する**（DCR Transparency for delegation 準拠）:

```
以下を使用します:
- [skill/agent名] ([目的の1行説明])
```

4. ユーザーの承認後、または P1 read-only の単独低リスク探索であることを確認後、`/skill-name` で発火する

## 報告ルール

- 単一スキルでも省略しない
- サブエージェントを併用する場合はエージェント名も列挙する
- Layer 1 (常時ロード) スキルも報告対象とする
- 複数スキルが候補の場合は優先順位を付けて最大3つ提案する

## Layer 1: Always-On スキル（常時ロード済み — 候補提示対象）

以下は description がコンテキストに常駐し、モデルが候補に挙げやすい:

| スキル | 用途 |
|---|---|
| code-review | コードレビュー、レビューフィードバック対応 |
| systematic-debugging | バグ、テスト失敗、予期しない挙動の調査 |
| verification-before-completion | 完了・修正・パス主張前の検証 |
| writing-plans | マルチステップタスクの計画作成 |
| search-first | 実装前の既存ツール・ライブラリ調査 |
| continuous-learning | セッション中の学びの記録 |
| continuous-learning-v2 | instinct の管理・昇格 |
| dcr-pipeline | DCR ゲート連鎖の自動管理 |
| eval-harness | validate.ps1 での構造品質検証 |
| brainstorming | 機能設計・創造的作業の前段階 |
| subagent-driven-development | 独立タスクの並列実行 |
| api-design | REST API 設計チェックリスト |
| prompt-master | プロンプトの作成・改善・最適化 |
| model-route | タスク難易度に応じたモデル選択 |
| strategic-compact | コンテキスト圧縮タイミングの提案 |
| tdd-workflow | テスト駆動開発ワークフロー |
| prd-to-issues | PRD を実装可能な Issue 群に分解 |
| improve-codebase-architecture | 構造改善ポイントの探索と提案 |

## Layer 3: Manual-Only スキル（手動発火のみ — インデックス）

以下は `disable-model-invocation: true` が設定されており、`/skill-name` での明示的な呼び出し、またはこの skill-router 経由でのみ発火する。

## Layer 3A: 中分類オーケストレーション（親カテゴリ）

親カテゴリは「どの束を先に見るか」を決めるための導線であり、実行単位は子スキル。

| 親カテゴリ | 主な対象 | 代表的な子スキル |
|---|---|---|
| 集客・成長 | 集客、CVR、価格、ローンチ | `ad-creative`, `copywriting`, `pricing-strategy`, `programmatic-seo` |
| 文書・資料 | 文書作成、編集、変換、監査 | `doc-coauthoring`, `docx`, `pdf`, `pptx`, `xlsx` |
| UI/体験設計 | UI設計、静的ビジュアル、テーマ適用 | `ui-ux-pro-max`, `canvas-design`, `theme-factory` |
| 開発運用 | 開発運用、テスト、デプロイ戦略 | `deployment-patterns`, `webapp-testing`, `using-git-worktrees` |
| ルール運用・監査 | skill運用、監査、拡張 | `harness-audit`, `rules-distill`, `skill-creator`, `mcp-builder` |

## Layer 3B: 互換マッピング（旧導線 -> 新カテゴリ）

移行中の探索コストを下げるため、旧導線をカテゴリに読み替える。

| 旧導線・キーワード | 新カテゴリ |
|---|---|
| SEO、検索流入、構造化データ | 集客・成長 |
| 提案書、Word/PDF/PPT/Excel | 文書・資料 |
| UIレビュー、デザイン改善 | UI/体験設計 |
| CI/CD、worktree、E2E | 開発運用 |
| ルール整備、監査、skill管理 | ルール運用・監査 |

注記: 上記はあくまで入口整理。必要なら直ちに子スキルを直接実行してよい。

## パイロット導入手順

最初から全カテゴリへ広げず、1カテゴリで運用評価してから展開する。

### 推奨パイロットカテゴリ

- 第一候補: 文書・資料
- 理由: 対象スキルが明確で、入出力の種類も整理しやすく、誤ルーティングを観測しやすい

### 評価手順

1. 文書系の依頼を5件集める
2. まず親カテゴリ `文書・資料` で候補選定する
3. 毎回、最終的に選ばれた子スキルと理由を記録する
4. 直接 `/skill-name` を使った場合も併記して比較する

### 観測指標

- 初回候補で正解に到達した割合
- 候補提示から実行までの選択時間
- 親カテゴリを経由せず直接実行した比率
- 想定外カテゴリへ誤案内した件数

### 合格基準

- 初回候補到達率: 80%以上
- 誤案内件数: 5件中0〜1件
- 直接実行比率: 高くても問題ないが、理由を記録する

### 展開条件

- 合格基準を満たしたら、次カテゴリへ同じ手順を横展開する
- 満たさない場合は、親カテゴリ名か互換マッピングを先に修正する

### 運用記録テンプレート

パイロット中は、各依頼を次の形式で簡易記録する。

```md
- 依頼概要: [1行要約]
- 親カテゴリ: [文書・資料 / 集客・成長 / UI/体験設計 / 開発運用 / ルール運用・監査]
- 提示候補: [skill1, skill2, skill3]
- 最終選択: [skill-name]
- 実行経路: [オーケストレーション / 直接指定]
- 選択時間: [おおよその秒数]
- 誤案内有無: [なし / あり]
- メモ: [迷った点、カテゴリ名の違和感、改善案]
```

### 親カテゴリの使い分けメモ

- 文書・資料: Word、PDF、PowerPoint、Excel、提案書、構造化された文書作業
- 集客・成長: SEO、広告、コピー、価格、CVR、導線改善
- UI/体験設計: 画面設計、見た目、体験改善、アクセシビリティ
- 開発運用: テスト、デプロイ、worktree、開発フロー
- ルール運用・監査: skill/rule保守、監査、MCPや運用基盤の整備

## metadata ベースの選定ルール

`rules/*.md` に `routing_category` がある場合は、ファイル名や本文の印象より先に metadata を使って粗く振り分ける。

優先順位は以下の順:

1. 明示指定された `/skill-name` または agent 名
2. `routing_category` による親カテゴリ一致
3. `keywords` の一致数
4. `domain` の近さ
5. `risk` による絞り込み

補足:

- `routing_category` は親カテゴリ決定専用であり、最終実行対象の確定には `keywords` と依頼文の目的を併用する
- `risk: high` は高リスク領域を示す。曖昧な依頼では low/medium より優先して確認対象に入れる
- `avoid_with` がある場合、その組み合わせは自動提案しない
- `pair_with` がある場合でも、同時提案は最大2件までに抑える

## 親カテゴリ -> 子候補の優先順位表

親カテゴリが決まったら、次の順で候補を出す。

### 文書・資料

1. ファイル形式が明示されている: `docx` / `pdf` / `pptx` / `xlsx`
2. 文書の執筆・要約・構成が主目的: `doc-coauthoring`
3. 技術文書やREADME/API文書が主目的: `technical-writer` 系 rule を優先
4. 視覚的な見せ方が主目的: `visual-storyteller`

### 集客・成長

1. SEO/検索流入: `seo-specialist`, `programmatic-seo`, `seo-audit`
2. 広告/コピー: `ad-creative`, `copywriting`, `copy-editing`
3. 価格/CVR/導線: `pricing-strategy`, `page-cro`, `signup-flow-cro`, `onboarding-cro`
4. SNS/コミュニティ: `social-content`, `instagram-curator`, `twitter-engager`, `reddit-community-builder`, `tiktok-strategist`

### UI/体験設計

1. UIレビュー/画面改善: `ui-ux-pro-max`, `ui-designer`, `ux-architect`
2. 調査/検証: `ux-researcher`, `accessibility-auditor`
3. ビジュアル表現: `canvas-design`, `theme-factory`, `inclusive-visuals-specialist`
4. 体験演出: `behavioral-nudge-engine`, `whimsy-injector`

### 開発運用

1. テスト/QA: `webapp-testing`, `qa-reality-checker`, `api-tester`, `test-results-analyzer`
2. デプロイ/CI/CD/基盤: `deployment-patterns`, `devops-automator`, `infrastructure-maintainer`
3. 実装支援: `backend-architect`, `frontend-developer`, `senior-developer`
4. フロー改善: `workflow-optimizer`, `jira-workflow-steward`, `using-git-worktrees`
5. 可観測性/性能: `observability-design`, `performance-profiling`
6. データ基盤: `database-schema-design`

### ルール運用・監査

1. セキュリティ/法務/ガバナンス: `security-engineer`, `security-deepdive`, `legal-compliance-checker`, `agentic-identity-trust-architect`
2. rule/skill整備: `rules-distill`, `skill-creator`, `harness-audit`
3. orchestration/進行統括: `agents-orchestrator`, `senior-project-manager`, `project-shepherd`
4. 基盤拡張: `mcp-builder`, `tool-evaluator`, `identity-graph-operator`

### マーケティング・グロース

| スキル | いつ使う |
|---|---|
| ad-creative | 広告コピー・ヘッドライン・バリエーション生成 |
| ai-seo | AI検索エンジン向けコンテンツ最適化 |
| analytics-tracking | GA4・GTM・コンバージョン追跡の設定 |
| churn-prevention | 解約防止・リテンション施策 |
| cold-email | B2B コールドメール・フォローアップ |
| competitor-alternatives | 競合比較ページ・代替ページ作成 |
| content-strategy | コンテンツ戦略・トピッククラスタ計画 |
| copy-editing | 既存マーケティングコピーの編集・改善 |
| copywriting | LP・HP・機能ページのコピーライティング |
| email-sequence | メールシーケンス・ドリップキャンペーン |
| form-cro | フォーム最適化（サインアップ以外） |
| free-tool-strategy | マーケティング用フリーツールの企画・構築 |
| launch-strategy | プロダクトローンチ・リリース戦略 |
| marketing-ideas | SaaS/ソフトウェアのマーケティングアイデア |
| marketing-psychology | 行動心理学のマーケティング応用 |
| onboarding-cro | サインアップ後のオンボーディング最適化 |
| page-cro | マーケティングページのCRO |
| paid-ads | PPC・有料広告キャンペーン戦略 |
| paywall-upgrade-cro | アプリ内アップグレード・ペイウォール最適化 |
| popup-cro | ポップアップ・モーダル・オーバーレイ最適化 |
| pricing-strategy | 価格設定・パッケージング・マネタイズ戦略 |
| product-marketing-context | プロダクトマーケティングコンテキスト文書 |
| programmatic-seo | テンプレート×データの大量SEOページ生成 |
| referral-program | 紹介プログラム・アフィリエイト設計 |
| signup-flow-cro | サインアップ・登録フロー最適化 |
| social-content | SNSコンテンツ作成・スケジュール最適化 |

### ドキュメント・ファイル

| スキル | いつ使う |
|---|---|
| doc-coauthoring | ドキュメント・提案書の共同執筆 |
| docx | Word文書の作成・編集・操作 |
| pdf | PDFの読み取り・結合・分割・作成 |
| pptx | PowerPointの作成・編集 |
| xlsx | スプレッドシートの作成・編集・変換 |
| schema-markup | 構造化データ・JSON-LD の追加・修正 |
| seo-audit | 技術的SEO・オンページSEO監査 |

### UI・デザイン

| スキル | いつ使う |
|---|---|
| canvas-design | ポスター・アートなどの静的ビジュアル作成 |
| theme-factory | 成果物へのテーマ・スタイル適用 |
| ui-ux-pro-max | UI/UX設計・レビュー・アクセシビリティ |
| web-artifacts-builder | 複雑なHTML/React/Tailwindアーティファクト |
| remotion-best-practices | Remotionでのビデオ生成 |

### 特化ワークフロー

| スキル | いつ使う |
|---|---|
| deployment-patterns | CI/CD・ロールバック・段階リリースパターン |
| finishing-a-development-branch | 実装完了後のマージ・PR・クリーンアップ判断 |
| using-git-worktrees | feature用のgit worktree分離 |
| webapp-testing | Playwrightでのローカルウェブアプリテスト |
| prd-to-issues | PRD を独立 Issue へ分解 |
| improve-codebase-architecture | テスタビリティ重視の構造改善提案 |
| observability-design | メトリクス・ログ・トレースの可観測性設計 |
| database-schema-design | スキーマ設計・マイグレーション・インデックス戦略 |
| security-deepdive | OWASP Top 10 深掘り・暗号選定・コンプライアンス |
| performance-profiling | 言語別プロファイリング・ボトルネック分析 |

### メタ・監査

| スキル | いつ使う |
|---|---|
| find-skills | スキルの検索・インストール (npx skills) |
| harness-audit | harness 健全性の監査 |
| rules-distill | 実践知の抽出・rule 昇格判定 |
| security-scan | agent設定のセキュリティ監査 |
| skill-creator | スキルの新規作成・改善・評価 |
| mcp-builder | MCPサーバーの構築ガイド |

## マッチングガイドライン

タスクの内容から以下の優先度で判定する:

1. **明示指定優先**: ユーザーが `/skill-name` を指定したら候補を確定し、権限に応じて承認後に実行する
2. **metadata 一致**: `routing_category` があれば親カテゴリ決定に使う
3. **キーワード完全一致**: 「広告コピー」→ `ad-creative`
4. **中分類一致**: まず親カテゴリを決め、その中で子スキル/role を最大3つ提案する
5. **ファイル形式一致**: `.docx` → `docx`, `.pdf` → `pdf`, `.pptx` → `pptx`, `.xlsx` → `xlsx`
6. **複合タスク**: 複数カテゴリにまたがる場合はカテゴリごとに1つずつ、合計最大3候補を提案

### 重み付きスコア方式

候補の順序を安定させるため、次の配点でスコアリングする。

| 判定要素 | 条件 | 点数 |
|---|---|---|
| 明示指定 | `/skill-name` または agent 名が明示されている | 即時確定 |
| 親カテゴリ一致 | `routing_category` が一致 | +5 |
| キーワード一致 | `keywords` が1件一致ごと | +2 |
| ドメイン一致 | `domain` が依頼の主語と一致 | +2 |
| 形式一致 | 拡張子や成果物形式が一致 | +1 |
| リスク整合 | 高リスク依頼で `risk: high` 候補 | +1 |
| 競合抑制 | `avoid_with` に衝突あり | -4 |

採用ルール:

- 上位スコアから最大3候補を提示する
- 同点なら `keywords` 一致数が多い方を優先する
- それでも同点なら `risk` が依頼に近い候補を優先する
- 最終候補に `avoid_with` の衝突がある場合は次点に差し替える

フォールバック:

- 全候補が 3 点未満なら「カテゴリ未確定」として直接確認質問を1つ返す
- 確信が低い場合でも、無理に1件へ確定せず2候補まで併記してユーザーに選択してもらう

## role と skill の使い分け

- 手順やツールが明確な作業は skill を優先する
- 専門的な判断やレビュー観点が必要な作業は rule/agent を優先する
- 依頼が「作る」中心なら skill 寄り、「評価する/設計する/監査する」中心なら rule/agent 寄り
- 迷う場合は skill 1件 + rule 1件までの併用に留める

## 実行モード

- オーケストレーションモード: 親カテゴリ -> 子スキルを選定し、必要な承認後に実行
- 個別モード: `/skill-name` を直接指定して候補確定
- 推奨: 不確実ならオーケストレーション、対象が明確なら個別モード

## 候補なしの場合

インデックスに該当スキルがない場合は:
- 「該当するスキルはありません。直接対応します。」と報告
- 必要に応じて `find-skills` でマーケットプレイスを検索する提案をする

---

## Trait Inheritance（ルールの継承）

`rules/*.md` に `inherits:` frontmatter がある場合、そのルールは `rules/_<trait>.md` の基準を前提として動作する。

### ルーターの振る舞い

1. rule を選定した際、`inherits:` を読み取る
2. 継承先の trait ファイル名を参照情報として報告する
3. rule の実行中は、trait の基準も暗黙に適用される
4. trait 間で矛盾がある場合は `inherits:` の記載順で先のものを優先する

## Deprecated / Prefer（非推奨と後継指定）

`rules/*.md` または `skills/*/SKILL.md` の frontmatter に以下のフィールドがある場合、ルーターはそれを尊重する。

### フィールド定義

```yaml
deprecated: true          # このスキル/ルールは非推奨
prefer: "new-skill-name"  # 代わりに使うべきスキル/ルール名
sunset_date: "2025-09-01" # 廃止予定日（任意）
```

### ルーターの振る舞い

1. `deprecated: true` のスキル/ルールは候補から自動除外する
2. `prefer` が指定されていれば、代わりに後継を候補に含める
3. ユーザーが明示的に `/deprecated-skill` を指定した場合は実行するが、警告を表示する:
   ```
   ⚠️ [skill-name] は非推奨です。代わりに [prefer] の使用を推奨します。
   ```
4. `sunset_date` を過ぎた場合は明示指定でもブロックし、後継への移行を案内する

### 報告フォーマット

```
以下を使用します:
- frontend-developer (UI実装の専門ロール)
  継承: coding-standards, typescript-standards, testing-standards, git-conventions
```

### 対象外

- `inherits:` がない rule はそのまま単独で動作する
- trait ファイル自体（`_*.md`）は直接選定対象にならない
- `deploy.ps1` は inheritance を解決しない（実行時にモデルが参照する）

## Skill Contract（スキルの入出力契約）

`skills/*/SKILL.md` に `contract:` がある場合、ルーターは選定時に precondition を検証する。

### 事前検証フロー

1. 候補スキルの `contract.preconditions` を読み取る
2. 現在のコンテキスト（依頼内容、既存成果物）と照合する
3. precondition が満たされていない場合:
   - ユーザーに不足情報を1つの質問で確認する
   - または precondition を満たす別のスキルを先に提案する

### パイプラインチェーン検証

複数スキルを連鎖させる場合:

```
brainstorming → writing-plans → [implementation] → verification-before-completion
```

各接続点で「前スキルの postcondition ⊇ 次スキルの precondition」を確認する。
不整合があれば、間に補完スキルを挿入するか、ユーザーに確認する。

### 報告フォーマット

```
以下を使用します:
- writing-plans (実装計画の作成)
  ✅ 前提条件: spec または要件が存在する → 充足
```

precondition 不足時:

```
- writing-plans (実装計画の作成)
  ⚠️ 前提条件不足: "spec, requirements, or user request with clear goal exists"
  → 先に brainstorming で要件を整理しますか？
```

## Temporal Phase Modifier（時間認識型スキル活性化）

`.dcr/phase.yaml` にプロジェクトフェーズが定義されている場合、スコアリングに phase modifier を適用する。

### 適用ルール

1. `.dcr/phase.yaml` の `current_phase` を読み取る
2. 該当フェーズの `boost` リストに含まれるスキル → **+3 点**
3. 該当フェーズの `suppress` リストに含まれるスキル → **-3 点**
4. `restrict_to_p3` がある場合、該当操作の権限を P3 に引き上げる

### フェーズ一覧

| フェーズ | 用途 | boost 対象 |
|---|---|---|
| `sprint-start` | 計画・設計 | writing-plans, brainstorming, prd-to-issues |
| `sprint-mid` | 実装（デフォルト） | tdd-workflow, systematic-debugging, code-review |
| `sprint-end` | レビュー・完了 | code-review, verification-before-completion |
| `release-prep` | リリース準備 | verification-before-completion, security-scan |
| `code-freeze` | 緊急修正のみ | systematic-debugging, security-scan |
| `hotfix` | 最小最速修正 | systematic-debugging, verification-before-completion |
| `exploration` | PoC・探索 | brainstorming, search-first |

### フェーズ検出ヒューリスティック

phase.yaml の `current_phase` を手動設定するのが基本だが、以下から自動推定も可能:

- ブランチ名に `release/` → `release-prep`
- ブランチ名に `hotfix/` → `hotfix`
- タグ `code-freeze` が HEAD にある → `code-freeze`
- 上記に該当しない → `phase.yaml` の値をそのまま使用

## Intent-Based Dynamic Weights（使用実績ベースの動的重み）

`.dcr/intent-log.jsonl` にルーティング決定のログが蓄積されている場合、統計ベースの重み調整を適用する。

### ログ記録タイミング

ルーターがスキル/ルールを選定して実行が完了した後、以下を記録する:

```jsonc
{
  "ts": "2026-04-10T14:30:00+09:00",
  "intent": "依頼の1行要約",
  "category": "ui-ux",
  "selected": "frontend-developer",
  "route": "orchestration",
  "outcome": "success",
  "phase": "sprint-mid",
  "override": null
}
```

### 動的重みの適用

`tools/aggregate-intent.ps1` が出力する `.dcr/intent-weights.md` の adjustment 値を、基本スコアに加算する。

| 指標 | 計算 |
|---|---|
| 成功率 | (success_rate - 0.5) × 4 |
| オーバーライドペナルティ | -override_rate × 3 |
| 調整値 | 上記合計を [-3, +3] にクランプ |
| 適用条件 | サンプル数 ≥ 5 |

### 統合スコア計算式

```
最終スコア = 基本スコア
           + phase_modifier     (boost: +3 / suppress: -3)
           + intent_adjustment  ([-3, +3], サンプル≥5のみ)
           + avoid_with penalty (-4)
```

基本スコアの内訳は既存の重み付き方式:

| 判定要素 | 点数 |
|---|---|
| 親カテゴリ一致 | +5 |
| キーワード一致 (各) | +2 |
| ドメイン一致 | +2 |
| 形式一致 | +1 |
| リスク整合 | +1 |

### フォールバック

- intent-log が存在しない場合: 基本スコア + phase_modifier のみで選定
- サンプル不足の場合: adjustment = 0 として扱う
- intent-weights.md が古い場合: 基本スコアにフォールバック（警告なし）

## Compositional Skill Algebra（スキル合成代数）

`skills/*/SKILL.md` に `composable:` frontmatter がある場合、ルーターはスキルをチェーン実行できる。

### 合成オペレータ

| オペレータ | 表記 | 意味 |
|---|---|---|
| Sequence | `A → B` | A 完了後、出力を B に渡す |
| Parallel | `A \|\| B` | A と B を独立実行し、結果をマージ |
| Conditional | `A ? B : C` | A 成功なら B、失敗なら C |

### 型互換マトリクス

合成時、前スキルの `output_type` が次スキルの `input_type` と互換である必要がある。

| output ↓ → input → | intent | spec | code | review | artifact |
|---|---|---|---|---|---|
| intent | ✅ | ✅ | — | — | — |
| spec | — | ✅ | ✅ | — | — |
| code | — | — | ✅ | ✅ | ✅ |
| review | — | ✅ | ✅ | — | — |
| artifact | — | — | — | ✅ | ✅ |

### 合成検出ヒューリスティック

ルーターは以下の手がかりで自動合成を提案する:

1. ユーザーの依頼が複数ステップを暗示（「設計して実装して」等）
2. 選定スキルの `contract.postconditions` が別スキルの `preconditions` を充足する
3. `.dcr/compositions.yaml` に定義済みチェーンがマッチする

### 定義済みチェーン（`.dcr/compositions.yaml`）

| チェーン名 | フロー | 用途 |
|---|---|---|
| `feature-pipeline` | brainstorming → writing-plans → 実装 → verification | 新機能の完全開発 |
| `quality-pipeline` | code-review → systematic-debugging → verification | 品質改善 |
| `debug-verify` | systematic-debugging → verification | バグ修正 |
| `plan-pipeline` | brainstorming → writing-plans | 計画立案 |
| `tdd-feature` | brainstorming → writing-plans → tdd-workflow → verification | TDD開発 |

### 報告フォーマット

```
以下の合成ワークフローを使用します:
📐 feature-pipeline: brainstorming → writing-plans → [実装] → verification-before-completion
  型フロー: intent → spec → spec → code → report
```

### 合成ボーナス

マルチステップ依頼で定義済みチェーンがマッチした場合、チェーン内の各スキルに **+2 点** のボーナスを加算する。

### フォールバック

- `composable:` がないスキルはチェーンに含めない（単独実行のみ）
- 型互換が不成立の場合、間に補完スキルを挿入提案する
- チェーンの長さが 4 を超える場合、ユーザーに確認してから実行する

## Adversarial Review（対抗レビュー）

`rules/*.md` に `challenge:` frontmatter がある場合、ルーターはプライマリ実行後にチャレンジャーを提案できる。

### 対抗レビューフロー

1. プライマリエージェント（例: `backend-architect`）がタスクを完了
2. ルーターが `.dcr/adversarial-pairs.yaml` を参照
3. `auto_trigger` 条件に一致するチャレンジャーを最大2件選定し、必要な承認を取る
4. チャレンジャーがプライマリの出力をレビュー
5. 結果を `⚔️` プレフィックス付きで報告

### 対抗ペア一覧

| チャレンジャー | ターゲット | 観点 | トリガー |
|---|---|---|---|
| security-engineer | backend-architect, frontend-developer, senior-developer | security, architecture | on-completion |
| performance-benchmarker | backend-architect, frontend-developer | performance | on-completion |
| accessibility-auditor | frontend-developer, ui-designer | ux, correctness | on-completion |
| qa-reality-checker | senior-developer, rapid-prototyper | correctness | on-completion |
| evidence-collector | senior-developer, frontend-developer, backend-architect | correctness | on-pr |

### 報告フォーマット

```
⚔️ 対抗レビュー:
- security-engineer がレビューします (セキュリティ・アーキテクチャ観点)
  対象: backend-architect の実装結果
```

### エスカレーション

- チャレンジャーが severity: high 以上の問題を検出 → P3 承認を要求
- 同一タスクへのチャレンジャー上限: **2件**
- チャレンジャーの所見はプライマリをブロックしない（advisory report）

### 対抗レビュー抑制

以下の場合は対抗レビューを提案または発火しない:

- `auto_trigger: manual` のチャレンジャー
- phase が `hotfix` または `code-freeze`（最小最速を優先）
- ユーザーが明示的に「レビュー不要」と指示した場合

## Federated Skill Marketplace（連合スキルマーケット）

`skills/*/SKILL.md` に `package:` frontmatter がある場合、そのスキルは `.dcr/registry.yaml` に登録され、クロスリポジトリで共有可能になる。

### レジストリ参照

ルーターが候補なしの状態に到達した場合:

1. `registry.yaml` の `tags` と `input_type/output_type` で検索する
2. 該当スキルがあれば、インストール済みか確認する
3. 未インストールなら「このスキルのインストールを提案しますか？」と返す

### スキルのエクスポート

```powershell
.\tools\skill-package.ps1 -Export -SkillName brainstorming
```

`export/<skill-name>/` に manifest.json と SKILL.md が出力される。
他のリポジトリで `skills/` にコピーして利用する。

### レジストリの自動更新

```powershell
.\tools\skill-package.ps1 -GenerateRegistry
```

`package:` 付きの全スキルから `.dcr/registry.yaml` を再生成する。

### バージョン互換チェック

- `package.compat` フィールドで DCR フレームワークの最低バージョンを宣言する
- `package.dependencies` が全て存在することを `validate.ps1` で検証する
- 依存スキルのバージョン不整合は警告として報告する（ブロックはしない）

### 統合スコア計算式（最終版）

```
最終スコア = 基本スコア
           + phase_modifier       (boost: +3 / suppress: -3)
           + intent_adjustment    ([-3, +3], サンプル≥5のみ)
           + composition_bonus    (定義済みチェーンマッチ: +2)
           + avoid_with penalty   (-4)
```
