# Hub Promotion Criteria — いつ親ハブを作るか

カタログに **「親ハブ + variant」** 構造を導入する判断基準。
ハブ過多は新たな迷いを生み、ハブ不足は重複を温存する。本ドキュメントで線引きする。

## ハブ化を検討する3つのトリガー

以下のいずれかに該当した時、ハブ化の **検討** を開始する：

1. **3 件以上の近接 variant** が同じ `routing_category` 内に存在し、
   それぞれの description / keywords が3割以上重なる
2. **共通のフレームワーク・テンプレート** が variant 間で繰り返し記述されている
3. **router の confidence** が3つ以上の候補で 0.7-0.85 に分散しており、
   ユーザーが毎回選択を求められる

## ハブを作る判断（5基準すべて満たすこと）

| # | 基準 | 確認方法 |
|---|---|---|
| 1 | **3件以上の variant** が存在 | `Get-ChildItem` でカウント |
| 2 | **共通の上位概念** が日本語1行で言語化できる | レビュー会話で1名以上が同意 |
| 3 | **共通テンプレート/原則** がハブの `scripts/` に集約できる量がある | 行数 30 行以上を目安 |
| 4 | **入力分類が決定的** に variant に分岐できる | 判定木 5 行以内で書ける |
| 5 | **新規 variant の追加余地** が予見できる | 業界トレンドとして拡張余地あり |

## ハブを **作らない** 判断（以下のいずれか1つでも該当）

- variant 数が 2 件以下 → sibling 相互参照で十分
- variant 間の差が「言語・バージョン・プラットフォームのみ」で本質が同じ → variant のメタデータに version/language/platform フィールドで対応
- 入力分類で分岐できず、AI がほぼランダムに変種を選ぶ
- 共通 scripts に収まる原則が薄い（記述したらハブ自身がスカスカになる）
- 個別 variant に圧倒的なボリューム差があり、上位概念が無理筋

## 既存ハブの実例と判断ログ

### ハブ化した例

#### conversion-optimization-hub
- **variants**: page-cro / popup-cro / form-cro / signup-flow-cro / onboarding-cro / paywall-upgrade-cro（6件）
- **判断**: 5基準すべて満たす。共通 scripts に「価値提案・摩擦軽減・心理的ハードル・社会的証明・緊急性・CTA規律」が集約できた
- **routing 効果**: ユーザーが「CRO」とだけ言えばハブで吸収、内部で variant 自動分岐

#### persuasive-content-craft
- **variants**: copywriting / copy-editing / ad-creative（3件）
- **判断**: 5基準すべて満たす。PAS/AIDA/4U/BAB 等のフレームワークが共通
- **scripts**: `copy-frameworks.md` に集約

#### email-marketing-flow
- **variants**: email-sequence / cold-email（2件）→ ぎりぎり
- **判断**: 件数は2件だが、ハブ化により strategic-messaging との階層関係が明確になり、共通 `email-templates.md` が成立。例外的にハブ化
- **教訓**: 件数 2 でも基準 1 以外が満たされていればハブ化可。ただし「scripts が成立すること」が分水嶺

#### strategic-messaging
- **variants**: content-strategy / marketing-psychology（2件）
- **判断**: ハブというより「3層モデル（戦略/心理/表現）」の **基盤層**。
  実装は他の variant スキル（copywriting 等）が継承する形で、独立 variant は 2 件
- **教訓**: 「ハブ」と「基盤層」は別の概念。基盤層は parent を持たれる側、参照されるための存在

### ハブ化しなかった例

#### SEO 関連
- **対象**: seo-audit / ai-seo / programmatic-seo / schema-markup（4件）
- **判断**: 統合せず。schema-markup は seo-audit に absorb（depth=technical）させたが、
  ai-seo と programmatic-seo は **手法が根本的に異なる**（ai-seo は LLM 検索エンジン向け、
  programmatic は大量生成）ため共通 scripts が成立しない
- **教訓**: 同じ語幹（SEO）でも、本質的な手法が異なるなら別スキルで残す

#### PM 関連
- **対象**: senior-project-manager / project-shepherd（2件、sprint-prioritizer は absorbed）
- **判断**: ハブ化せず、絶対の役割差で残す
  - senior-project-manager: 計画・優先順位・スプリント運営
  - project-shepherd: 横断調整・timeline 規律
- **教訓**: 似て見えても **「実行責務」と「調整責務」** のように軸が違うなら sibling のまま

## ハブ作成手順

1. `mkdir .ai/catalog/skills/<hub-name>/` （新ディレクトリ）
2. `<hub-name>/SKILL.md` を作成し以下を含める：
   - `name`, `description`（トリガー語を網羅）
   - `parent: <upper-hub or 基盤層>` （任意）
   - `variants: [<variant1>, <variant2>, ...]`
   - `absorbs_routing_for: [...]` （router がハブを優先する宣言）
   - `shared_resources: [scripts/<name>.md]`
   - 判定木表（入力シグナル → variant）
   - 共通原則セクション
   - 報告テンプレート
3. `<hub-name>/scripts/<name>.md` に共通テンプレ/原則を集約
4. 各 variant に追加：
   ```yaml
   parent: <hub-name>
   variant_role: <短い役割記述>
   shared_resources:
     - ../<hub-name>/scripts/<name>.md
   ```
5. `tools/eval-routing-fixtures.json` にハブ用フィクスチャを追加
6. `.\tools\eval-routing-accuracy.ps1` を実行して 100% を維持
7. CLAUDE.md / AGENTS.md を再生成

## 関連

- 命名規則: `.ai/catalog/rules/_NAMING_CONVENTION.md`
- 削除サイクル: `.ai/module/deprecation-lifecycle.md`
- 統一ルーター: `.ai/module/unified-router.md`
