# Unified Router Module

`pied-piper`（Unified Coordinator）が参照する **ルーティング決定木の正本**。
旧 `skill-router` skill の責務を吸収し、Rule + Skill + Agent の3資産横断で同じロジックを適用する。

## 決定木（優先順位順）

```
0. 【必須前処理】Alias 解決
   → 候補名の frontmatter に deprecated: true があれば、
     successor フィールドの値に黙って置換
   → 内部ログには「旧名 X → 新後継 Y」を記録
   → ユーザー報告（3行テンプレ）には新名のみ表示

1. ユーザー明示指定（/skill-name, "use agent X", "ルール Y を使って"）
   → Step 0 を適用してから、そのまま採用、信頼度 1.00、理由"explicit"

2. routing_category exact match（frontmatter）
   → 一致した資産を候補に上げる

3. keywords 一致数（重み付け）
   → 名詞ヒットは2点、動詞ヒットは1点、descriptionヒットは1点

4. domain match
   → 同一 domain の資産を優先

5. risk 整合
   → high-risk タスク（destructive ops, 金融, 法務, prod 影響）は
     risk:high を持つ資産でないと却下

6. phase 整合
   → plan/impl/qa/ship のうち現在の phase に合うもの
   → phase は kernel/gate-state.json から取得
```

## confidence 計算

```
confidence = 0.5
  + (routing_category match ? 0.20 : 0)
  + (keywords match score / max possible) * 0.15
  + (domain match ? 0.10 : 0)
  + (risk 整合 ? 0.05 : -0.30)
```

- `>= 0.8` → automatic dispatch
- `0.5 - 0.8` → 候補2-3件をユーザー提示
- `< 0.5` → 「該当スキル/ルールを特定できません」と申告し質問で絞り込む

## 親ハブ優先ルール

以下の親ハブが存在する場合、variant 直接指定でない限り **親を優先選定**：

| 親ハブ | 内部 variant |
|---|---|
| [conversion-optimization-hub](../catalog/skills/conversion-optimization-hub/SKILL.md) | page / popup / form / signup-flow / onboarding / paywall-upgrade |
| [strategic-messaging](../catalog/skills/strategic-messaging/SKILL.md) | content-strategy / marketing-psychology |

親が選定されたあと、親 SKILL.md 内の variant 判定表で内部分岐する（router の関心外）。

## 後継の自動転送（alias）

frontmatter に `deprecated: true` がある場合：
1. 旧名で呼ばれても、`successor` フィールドの新名に **黙って** 転送
2. ログにのみ「旧名 X → 新名 Y で実行」を記録
3. ユーザーへの報告 (3行テンプレ) では新名のみを表示

これにより、CLAUDE.md / AGENTS.md / 既存ドキュメント中の旧名参照が壊れずに移行できる。

## 親 → 子の階層解決

`absorbs` フィールドに名前が並ぶ場合、親が選定されると子は **暗黙的に内部利用可能** になる。例：

```
research-analyst.absorbs = [docs-researcher, market-researcher, competitive-analyst, ...]
```

→ ユーザーが「市場調査」と言ったとき、router は research-analyst を選ぶが、
研究内部では competitive-analyst の手法を呼び出して良い。

## 同一 phase での並列ルーティング

`pied-piper` は最大2件まで採用する。例：
- 「ログイン機能のセキュリティを見たい」
  → primary: `security-auditor` (audit)
  → secondary: `code-reviewer` (auth code path)

3件以上必要と判断された場合は、ユーザーに「並列でX件動かしますか？」と確認する。

## ルーティング結果のスキーマ

```json
{
  "input": "<元ユーザー発話>",
  "classification": {
    "intent": "implementation|research|review|qa|...",
    "domain": "frontend|security|...",
    "risk": "low|medium|high",
    "phase": "plan|impl|qa|ship"
  },
  "selected": [
    {
      "kind": "skill|rule|agent",
      "name": "<採用名>",
      "via_alias_from": "<旧名 if applicable>",
      "confidence": 0.85,
      "reason": "routing_category=growth + keywords[CRO,LP] hit",
      "expected_effect": "LP CVR +X% を狙う構造化提案"
    }
  ],
  "phase_modifier": "<from gate-state.json>"
}
```

## ユーザー個人設定（CLAUDE.local.md / AGENTS.local.md）の優先関係

ローカル個人設定はチームのカタログより **常に優先** される。具体的には：

```
優先度（高 → 低）:
  1. CLAUDE.local.md（薄い入口） / .claude/local/CLAUDE.local.md（実体） / AGENTS.local.md / GEMINI.local.md（gitignored ローカル）
  2. ユーザーの当該ターン明示指定（"/skill X" "use agent Y"）
  3. unified-router 決定木 Step 0（alias 解決）
  4. unified-router 決定木 Step 1-6（routing_category 〜 phase 整合）
  5. デフォルト動作（kernel/gates/ 系）
```

ローカル設定の解釈ルール：
- **「常に X を使え」型の指示** → router の Step 1-6 をオーバーライド、Step 0（alias 解決）は維持
- **「Y を使うな」型の指示** → router 候補から該当エントリを除外、信頼度を 0.0 にする
- **「日本語で答えろ」「コミット粒度」型の作業スタイル** → router の選定には影響しない、応答生成にのみ反映
- **矛盾する指示**（CLAUDE.local.md と当該ターン発話） → 当該ターン発話を優先（より新しい意図）

ローカル設定の **検出ポイント**：
- セッション開始時に CLAUDE.local.md / .claude/local/CLAUDE.local.md / AGENTS.local.md を読み込み、`Local Preferences` セクションをパース
- pied-piper は決定木の Step 0 の **前** に「ローカル明示指定」のチェックを入れる
- 該当時は `via_local_override: true` を decisions log に記録（観測性のため）

## 関係ファイル

- 実体 agent: [pied-piper](../catalog/agents-source/pied-piper.md)
- 統合層: [unified-coordinator.md](unified-coordinator.md)
- インデックス: `.ai/catalog/rules/_ROUTING_INDEX.md` (auto-generated)
- ゲート状態: `.ai/kernel/gate-state.json` (Phase B-4)
- 決定ログ: `.ai/kernel/router-decisions.jsonl` (中期-C, gitignored)
- ハブ判定: [hub-promotion-criteria.md](hub-promotion-criteria.md)
- 削除サイクル: [deprecation-lifecycle.md](deprecation-lifecycle.md)

## 決定ログ書き込み義務（Mandatory）

選定が確定したら、`tools/lib/gate-state.ps1` の `Write-RouterDecision` を呼んで
JSONL に1行追記する。これにより精度測定・alias 使用頻度・低信頼ケースの
事後レビューが可能になる：

```powershell
. .\tools\lib\gate-state.ps1
Write-RouterDecision -RepoRoot $RepoRoot `
  -Input "<元ユーザー発話>" `
  -Kind skill -Name conversion-optimization-hub -Confidence 0.92 `
  -Reason "routing_category=growth + keywords[CRO,LP] match" `
  -ExpectedEffect "page-cro variant で構造化提案" `
  -Phase impl
```

旧名で呼ばれて Step 0 で置換した場合は `-ViaAliasFrom <旧名>` を必ず添える。
集計は `Get-RouterDecisionStats` で確認できる（top10/平均信頼度/alias 使用率）。

## Migration Note

旧 `skill-router` skill は Phase C で deprecated → 削除予定。
本モジュールが正本として完全に代替する。
