# Unified Router Module

`pied-piper`（Unified Coordinator）が参照する **ルーティング決定木の正本**。
旧 `skill-router` skill の責務を吸収し、Rule + Skill + Agent の3資産横断で同じロジックを適用する。
この module の目的は候補を増やすことではなく、ユーザーの自然言語から必要十分な候補だけに減らし、短く承認できる形へ束ねること。

## 決定木（優先順位順）

### Runtime Memory Preflight（任意）

`pied-piper` は通常ルーティングの前後で、過去判断が品質に影響するかを判定する。
agentmemory などの runtime memory backend が利用可能な場合のみ検索し、利用不可なら通常の repo 探索へフォールバックする。

自然言語 trigger:

- 「これどう？」「サトシ開発目線で」「前と同じ観点で」
- 「入れる価値ある？」「導入して」「置き換える必要ある？」
- 「また同じエラー」「前にもあった」「過去判断も踏まえて」
- 「いい感じに見て」「必要なら専門家使って」「大きめなら分担して」
- 「曖昧だけど改善して」「前と同じ感じで」「必要ならサブエージェントで」
- 外部 agent pack / skill catalog / MCP / runtime wrapper / memory backend の評価
- 正本/生成物境界、ファイル削除、採用/非採用ポリシーが関わる相談

検索対象:

- この repo の過去の同種タスク
- 関連ファイルの過去判断
- 既存の採用/非採用ポリシー
- 以前通った検証コマンド、失敗原因、残リスク

優先順位:

1. ユーザーの最新指示
2. `.ai/catalog` / `.ai/book` / repo 内 artifact
3. 現在の git 状態
4. runtime memory の recall

作業後に保存する場合は、決定・理由・検証結果・次回 recall trigger だけに絞る。
secret、PII、ログ全文、中間推論、正本に書くべき内容は保存しない。

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

- `>= 0.8` → 上位候補として扱うが、単独では実行許可にしない
- `0.5 - 0.8` → 候補2-3件をユーザー提示
- `< 0.5` → 「該当スキル/ルールを特定できません」と申告し質問で絞り込む

## 発火モード

confidence は候補順位を決める指標であり、単独では実行許可ではない。
`pied-piper` は候補選定後に `intent / domain / risk / phase / scale / ambiguity` の6軸で分類し、次の発火モードを決める。

| mode | 条件 | 動作 |
|---|---|---|
| `auto` | P1 read-only、単独候補、曖昧さ低、外部送信なし | 3行の事前報告後に実行 |
| `propose` | 複数候補、曖昧、タスク規模中以上、Skill/Agent 起動が有益 | おすすめを先頭に2-3候補を提示して確認 |
| `approve_required` | P2/P3、subagent、並列、外部 MCP/API、設定変更、削除、依存変更、セキュリティ/金融/法務 | ユーザー承認まで発火しない |

高 confidence でも、Skill / Agent / サブエージェント / orchestration を使う場合は原則 `propose` 以上にする。
低リスク P1 の読み取り調査だけは `auto` にできる。

## Cognitive Load Contract

`pied-piper` / `unified-router` は「候補を増やす司令塔」ではなく、「候補を減らして束ねる入口」として振る舞う。

- ユーザーに見せる候補は最大3件。通常はおすすめ1件だけを先頭に出す。
- 内部候補、スコア詳細、分類軸の全文は `router-decisions.jsonl` に残し、通常応答では展開しない。
- 曖昧または中規模以上の依頼では、候補を2-3件に圧縮し、A/B/C で選べる形にする。
- 提案は `採用候補 / 理由 / 期待効果` の3行を標準にする。
- `approve_required` の場合だけ、4行目に `承認が必要な理由` を追加する。
- 選択肢は `A) おすすめで進める / B) 軽めに見る / C) 別案を見る` を基本形にする。該当しない場合だけ短く言い換える。

### 12-factor alignment guard

外部設計原則 humanlayer/12-factor-agents は、DCR の runtime ではなく判断軸として参照する。
`pied-piper` は次の観点を満たす場合だけ Skill / Agent / orchestration の採用を強く推奨する。

- prompt と routing 仕様が DCR 正本に残る
- proposal state と telemetry から、選定、承認、実行、却下を追跡できる
- tool selection と invocation の間で、必要な承認待ちにできる
- agent が大きくなりすぎる場合は、親ハブ化、表示抑制、bundle proposal を優先する
- CLI/IDE 固有の便利機能は、共通正本へ還元できる範囲に留める

### 自然言語承認ルール

次の語彙は、直前の提案候補が一意に特定できる場合だけ承認として扱う。

- `それで`
- `おすすめで`
- `Aで` / `1で`
- `進めて`
- `承認`

候補が複数あり、どれを指すか一意でない場合は実行せず、短く再確認する。

次の語彙は承認ではなく、候補提示または再確認に戻す。

- `いい感じに`
- `任せる`
- `よさそう`
- `たぶん`

分類結果は `user_reply_type: approve|reject|refine|ambiguous` として記録する。

## Proposal State Machine

直前に `gate-state.json` の `proposal_state.status = proposed|refined` がある場合、次の短い発話は新規依頼として扱う前に proposal reply として解釈する。

`proposal_state` は gitignored の `.ai/kernel/gate-state.json` に保存し、永続的な判断履歴は `router-decisions.jsonl` に残す。

保存内容:

- `proposal_id`
- `status`: `none|proposed|approved|rejected|refined|expired`
- `mode`: `auto|propose|approve_required`
- `options`: 最大3件、各 `id/kind/name/reason/expected_effect`
- `recommended_option`
- `selected_option`
- `created_at` / `updated_at`
- `last_user_reply_type`

状態遷移:

| reply type | 条件 | next status | 動作 |
|---|---|---|---|
| `approve` | active proposal があり、対象 option が一意 | `approved` | 選択肢を記録して承認済みにする |
| `reject` | `やめて` / `却下` / `違う` / `不要` / `キャンセル` / `中止` | `rejected` | 発火せず終了 |
| `refine` | `別案` / `別の案` / `軽めに` / `軽く` / `詳しく` / `もう少し` / `絞って` | `refined` | 同じ `proposal_id` 系列で候補・理由・期待効果を更新して再提案 |
| `ambiguous` | active proposal なし、または候補が一意でない | current / `none` | 発火せず短く再確認 |

`Resolve-ProposalReply` は deterministic な語彙ベースの分類に留める。LLM の補助判断は使ってよいが、承認・却下・発火可否の最終状態はこの state machine と permission overlay に従う。

## V5 自然語フィードバックループ

短い次発話は、active proposal がある場合だけ proposal reply として優先解釈する。

- `おすすめで` / `推奨で` / `Aで` / `1で` は対象が一意なら `approve`
- `それで` / `進めて` / `承認` / `OK` は単独候補の場合だけ `approve`
- 複数候補で汎用承認語だけの場合、または active proposal がない場合は `ambiguous`
- `任せる` / `おまかせ` / `よさそう` / `よさげ` / `たぶん` / `多分` は実行せず再確認
- この語彙は `tools/test-proposal-reply-vocabulary.ps1` で実行時挙動を固定する

## V6 CLI/IDE 統合仕上げ

Codex / Claude Code / VS Code Copilot の生成 entrypoint は、同じ自然語返答契約を短く読める状態にする。

- 入口には `pied-piper` が単一 coordinator であることを載せる
- `proposal_state.status = proposed|refined` の短い次発話を proposal reply として優先解釈することを載せる
- 承認・曖昧・却下・再提案の代表語彙を載せる
- `tools/test-routing-entrypoint-contract.ps1` で生成物の契約 drift を検出する

## 発火前提案テンプレート

実行前の3行報告は「発火済み報告」ではなく「発火前提案」として扱う。

```
採用候補：<rule/skill/agent名>（信頼度 0.XX / mode）
理由：<routing_category + match keywords/domain + risk/scale/ambiguity>
期待効果：<1行で見込まれる成果物・品質ゲート>
選択：A) おすすめで進める / B) 軽めに見る / C) 別案を見る
```

`approve_required` の場合は、4行目に「承認が必要な理由」を追加する。
曖昧な場合は、候補を2-3件に絞り、おすすめを先頭にしてユーザー確認を取る。

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

## 前後工程 agent の挿入

次の agent は primary agent の置換候補ではなく、phase gate として前後に挿入できる。

| agent | phase | trigger |
|---|---|---|
| `codebase-onboarding-engineer` | plan / pre-impl / pre-review | 初見領域、正本/生成物境界、実行経路、所有境界が不明 |
| `qa-evidence-collector` | post-impl / qa / ship | 完了主張に証跡が必要、UI/CLI/API の観測結果を固定したい |
| `accessibility-auditor` | qa | UI、keyboard、focus、semantic HTML、WCAG |
| `api-tester` | qa | API、CLI、MCP、webhook、auth、contract、third-party |
| `performance-benchmarker` | qa | latency、throughput、memory、startup、bundle size、resource cost |

これらは「同一 phase 最大2件」制限の外で、前後の phase gate として扱える。ただし同時に3件以上を並列実行する場合は通常の確認ルールに従う。

## ルーティング結果のスキーマ

```json
{
  "input": "<元ユーザー発話>",
  "classification": {
    "intent": "implementation|research|review|qa|...",
    "domain": "frontend|security|...",
    "risk": "low|medium|high",
    "phase": "plan|impl|qa|ship",
    "scale": "small|medium|large",
    "ambiguity": "low|medium|high"
  },
  "selected": [
    {
      "kind": "skill|rule|agent",
      "name": "<採用名>",
      "via_alias_from": "<旧名 if applicable>",
      "confidence": 0.85,
      "mode": "auto|propose|approve_required",
      "approval_required": true,
      "status": "proposed|approved|rejected|executed",
      "proposal_id": "rt-YYYYMMDD-HHMMSS-xxxx",
      "options_count": 3,
      "user_reply_type": "approve|reject|refine|ambiguous",
      "selected_option": "A|B|C|1|2|3|",
      "previous_status": "none|proposed|approved|rejected|refined|expired",
      "next_status": "none|proposed|approved|rejected|refined|expired",
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
  -Phase impl `
  -Risk low -Scale medium -Ambiguity low `
  -ProposalId "rt-20260517-120000-a1b2" `
  -OptionsCount 3 `
  -UserReplyType approve `
  -SelectedOption A `
  -PreviousStatus proposed `
  -NextStatus approved `
  -ApprovalRequired `
  -Status proposed
```

旧名で呼ばれて Step 0 で置換した場合は `-ViaAliasFrom <旧名>` を必ず添える。
ユーザーが候補を選んだ場合は `-SelectedByUser` を添え、承認後の実行時は `-Status approved` または `-Status executed` を記録する。
集計は `Get-RouterDecisionStats` と `tools/router-decisions-report.ps1` で確認できる（status 分布、承認待ち、top 候補、却下候補）。
V3 では `router-decisions-report.ps1` を Cognitive Load Observability の標準入口とし、`router-decisions.jsonl` と `gate-state.json` から ambiguous/refine/rejected の比率、stale proposal、次に削る/束ねる/明文化する候補を短く読む。
V4 では `tools/reduction-advisor.ps1` を候補削減の入口にする。advisor は `remove_later|bundle_into_hub|expose_underlying_asset|clarify_trigger|observe_more|no_action` を出すだけで、物理削除、deprecated 追加、正本変更は別のユーザー承認まで行わない。
V4.1 では `pied-piper` の集中を削除候補やハブ化候補にせず、`expose_underlying_asset` として扱う。coordinator が見えすぎる場合は、裏で選ばれた Rule/Skill/Agent を記録・表示する方向で整理する。
V7 では `router-decisions-report.ps1` と `reduction-advisor.ps1` が smoke/test/fixture 由来の synthetic telemetry を削減判断から除外する。実運用の non-synthetic decision が少ない場合は `collect_real_usage` を返し、削除・deprecated・表示抑制に進まない。
V7.1 では `tools/shadow-routing-trial.ps1` を使い、実作業に近い依頼文、候補、承認/却下/再提案、ユーザー評価 (`just_right|too_many|off_target|lighter|too_heavy|unclear`) を `shadow_trial: true` として記録する。これは削減そのものではなく、V8 以降の表示抑制や束ね直しの判断材料にする。
V8 では `tools/display-policy-advisor.ps1` が shadow trial から表示だけの改善候補を出す。対象は `suppress_secondary_options|show_underlying_asset|make_lightweight_default|demote_candidate|clarify_display_copy|keep_as_default` までで、削除、deprecated、routing の自動変更は行わない。実装変更に進む場合は、この advisor 出力を発火前提案としてユーザー承認に戻す。
V9 では `tools/display-policy-proposal.ps1` が V8 advisor 出力を最大3件の `proposal_state.options` に変換する。既定は preview のみで、`-CommitState` を付けた場合だけ `.ai/kernel/gate-state.json` に `approve_required` の承認待ち proposal として保存する。表示ポリシーの実変更は、この proposal が承認された後の別ステップにする。
V10 では `tools/bundle-advisor.ps1` が routing decision と catalog frontmatter から親候補への束ね案を出す。対象は `bundle_into_hub|expose_underlying_asset|clarify_parent_label|keep_separate|observe_more` までで、物理統合、削除、deprecated 追加は行わない。束ね案を実装に進める場合は V10.1 以降で承認 proposal に戻す。
V10.1 では `tools/bundle-proposal.ps1` が V10 advisor 出力を最大3件の `proposal_state.options` に変換する。既定は preview のみで、`-CommitState` のときだけ `.ai/kernel/gate-state.json` に `approve_required` の承認待ち proposal として保存する。束ね表示の実変更は、この proposal が承認された後の別ステップにする。

## Migration Note

旧 `skill-router` skill は Phase C で deprecated → 削除予定。
本モジュールが正本として完全に代替する。
