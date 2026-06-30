---
name: dcr-pipeline
routing_category: governance
description: "DCR Kernel のゲート連鎖 (p/ -> 実装 -> q/ -> sh/) を自動管理するパイプラインSkill。実装タスク開始時・完了時・リリース判定時に自動的に次ゲートへ誘導し、各ゲート通過条件をチェックする。Review、QA、security、OWASP、暗号、static analysis、webapp testing、performance、UAT、mobile CI/CD などの旧 pipeline alias skill もここへ畳む。Use when starting implementation tasks, completing features, or preparing for release."
contract:
  preconditions:
    - "The request matches this skill's description or routing category."
  postconditions:
    - "The response names the result, reasoning, and verification or handoff path."
  invariants:
    - "Do not treat generated mirrors or runtime caches as DCR source of truth."
composable:
  input_type: task
  output_type: artifact-or-decision
  chains_with:
    - verification-before-completion
runtime_targets:
  - codex
  - claude
  - cursor
---

# DCR Pipeline Skill

DCR Kernel のトリガーシステム (`p/`, `q/`, `sh/`) を一貫したパイプラインとして管理する。
各ゲートの通過条件を明確にし、手動でのゲート呼び出し忘れを防ぐ。

## Pipeline Overview

```
p/ (Plan Gate) -> 実装 -> q/ (QA Gate) -> sh/ (Ship Gate)
     ↓              ↓           ↓              ↓
  スコープ確定    チャンク実行   証拠ベース検証   リリース判定
```

## Consolidated Pipeline Aliases

OpenAI Skills baseline へのスリム化では、個別 QA / review / security / performance skill を削除せず、まずこの pipeline の phase alias として扱う。旧 skill は参照用に残し、routing は `dcr-pipeline` を優先する。

| Former skill | Pipeline phase | 扱い |
|---|---|---|
| `code-review` | q/ Review Gate | severity-ordered findings と approve/request-changes 判定 |
| `contract-testing` | q/ Contract Gate | API / schema / consumer-provider compatibility の検証 |
| `static-analysis` | q/ Static Gate | lint / typecheck / generated mirror drift / dangerous pattern scan |
| `webapp-testing` | q/ UI Evidence Gate | local web app の browser / Playwright / screenshot 検証 |
| `autonomous-qa-loop` | q/ Fix Loop | test -> classify failure -> minimal fix -> re-test の脱出条件付きループ |
| `uat-verification-gate` | q/ UAT Gate | 人間が確認できる受け入れ検証、証跡、再実行手順 |
| `security-deepdive` | q/ Security Gate | deep security review。軽量 scan は `security-scan`、公式 baseline は OpenAI `codex-security` |
| `supply-chain-security` | q/ Supply Chain Gate | SBOM、dependency audit、CI pinning、package integrity |
| `performance-profiling` | q/ Performance Gate | measurement-first bottleneck analysis and regression checks |
| `mobile-cicd` | sh/ Mobile Ship Gate | signing、EAS/Fastlane、TestFlight/Play Console release checks |
| `mobile-performance` | q/ Mobile Performance Gate | ANR/crash/battery/jank profiling before mobile release |
| `data-pipeline-orchestration` | p/ Data Pipeline Plan | DAG、backfill、freshness、SLA alerting を Plan Gate で扱う |
| `multimodal-pipeline` | p/ Multimodal Pipeline Plan | image/audio/PDF/model/cost path を Plan Gate で扱う |
| `model-debate-stress-test` | p/ Decision Stress Test | major options の前提・反論・judge を planning artifact に畳む |

## When to Activate

- ユーザーが実装タスクを依頼したとき（3ステップ以上の変更）
- `p/` トリガーが使われたとき
- 実装が完了し、次のゲートへの誘導が必要なとき
- Spec-first の clarify / analyze / checklist / doctor 相当の確認が必要なとき
- 旧 pipeline alias skill (`code-review`, `static-analysis`, `webapp-testing`, `security-deepdive` など) に一致する依頼が来たとき

## Phase 1: Plan Gate (p/)

### 入口条件
- ユーザーから実装要件が提示されている
- 対象ファイル・スコープが特定できる

### 実行内容
1. 対象ファイルを読み、現状を把握する
2. 変更スコープを箇条書きで定義する
3. 実装順序を依存関係に基づいて決定する
4. 検証方法を各変更項目に対して定義する
5. CI の有無と repo-native な検証コマンドを確認する
6. LLM アプリ、PR、外部公開、本番/CD に近い変更で最低 CI がない場合、lint / format、typecheck、test、必要時 smoke を計画に含める
7. **チェックリストを生成する**（後のQA Gateで使用）
8. 必要に応じて `model-route` で実装時のモデル階層を決める
9. Spec-first 補強が必要なら、以下を Plan に織り込む:
   - clarify: 不明な要求、非目標、制約を実装前に固定
   - analyze: spec / plan / tasks / code の矛盾を検出
   - checklist: 受け入れ条件を検証可能な項目へ分解
   - doctor: 正本、生成物、検証コマンド、外部依存の健全性を確認
10. データ / multimodal / mobile / model-debate 系の旧 skill に一致する場合は、上の Consolidated Pipeline Aliases の phase に検証項目として畳む

### 出口条件
- ユーザーがプランを承認した
- チェックリストが生成されている

### 次ゲートへの誘導
実装完了時に以下を提示:
```
PASS 実装完了。以下のゲートに進みます:
NEXT q/ でQA検証を実行します
```

## Phase 2: Implementation

### ルール
- Plan Gate で承認されたスコープのみ実装する
- 大きな変更はチャンクに分割し、各チャンク後に報告する
- 実装中に Plan からの逸脱を検知したら停止して再確認する
- **サブエージェント使用時は Transparency for delegation ルールに従う**

### 完了判定
- Plan のチェックリスト全項目が実装済み
- 明らかなエラー（構文エラー等）がない

### 自動誘導
実装の最後のチャンク完了時に:
```
PASS Plan の全項目を実装しました。
NEXT q/ でQA検証を実行することを推奨します
```

## Phase 3: QA Gate (q/)

### 入口条件
- 実装が完了している
- Plan Gate のチェックリストが存在する

### 実行内容
1. **コード全体を読む**（差分ではなく全体）
2. Plan のチェックリストを1項目ずつ検証する
3. リスク順に報告する（STOP 重大 -> FIX 中 -> GO 低）
4. 機能チェックリスト表を作成する（PASS / FAIL）
5. 構造品質は `eval-harness`、構成安全性は `security-scan` で補助検証する
6. CI / ローカル再現コマンドの証拠を確認する:
   - lint / format
   - typecheck
   - test
   - smoke / server response（サーバー・外部公開・LLMアプリで必要な場合）
7. 必要に応じて spec-kit review / threatmodel 相当の観点を追加する:
   - review: 実装品質、テスト、エラー処理、単純性
   - threatmodel: LLM/agent artifact、外部入力、権限、注入リスク
8. 旧 QA / review / security / performance skill に一致する場合は、専用 skill を個別発火せず、この gate の検証項目として扱う

### 報告フォーマット
```markdown
## QA Report - [対象名]

### STOP 重大
[機能不全の可能性があるもの]

### FIX 中リスク
[動作に影響しうるもの]

### GO 低リスク / 品質
[改善推奨だが動作には影響なし]

### 機能チェックリスト
| 機能 | 状態 |
|------|------|
| ... | PASS / FAIL |
```

### 出口条件
- STOP 重大が0件
- 全機能チェックリストが PASS

### STOP がある場合
```
STOP 重大な問題が [N]件 あります。修正後に再度 q/ を実行してください。
```

### 全パス時の誘導
```
PASS QA通過。全機能が正常に実装されています。
NEXT sh/ でリリース判定に進めます
```

## Phase 4: Ship Gate (sh/)

### 入口条件
- QA Gate を通過している（STOP = 0）

### 実行内容
1. リリース対象ファイル一覧
2. チェック項目表:
   - QA gate 通過
   - 重大バグなし
   - セキュリティ（外部入力、シークレット）
   - Git 状態（未コミット変更、ブランチ）
   - CI 状態（lint / format、typecheck、test、必要時 smoke が PASS）
3. DCR preflight:
   - `.ai/catalog` / `.ai/book` / `.ai/kernel` / `.ai/environments` / templates の正本変更が generated mirror へ反映済みか
   - routing index や generated entrypoint の drift が残っていないか
   - `deploy.ps1 -Check` と `validate.ps1` の最新結果を確認したか
   - 広範囲 cleanup / runtime removal / provider-reference removal では `dcr-surface-reviewer` 相当の表面レビューを済ませたか
4. 本番/CD/外部公開では、CI 不在・CI 失敗・CI 未確認のまま GO にしない。小さな試作のみ例外理由を明示して扱う
5. リリース判定: GO Ship可能 / STOP ブロッカーあり
6. コミットメッセージ案の提示
7. 必要時は `harness-audit` を実行し、運用負債を次サイクルに繰り越さない

### 出口条件
- ユーザーがコミット/マージを承認
- コミットが成功

## Edge Cases

### 途中でスコープ変更が発生した場合
```
FIX スコープ変更を検知しました。
WARN p/ でプランを更新してからに進むことを推奨します
```

### QA で修正が必要になった場合
修正後、QA Gate を再実行する（sh/ には進まない）。

### 小さな変更（3ステップ未満）の場合
Pipeline は推奨するが強制しない。ユーザーが直接 `sh/` を呼んでもよい。
ただし本番/CD/外部公開に進む場合は、変更規模に関わらず CI または同等の再現可能な検証証拠を確認する。

## Integration with DCR Kernel

このSkillは CLAUDE.md の以下と連携する:
- **Signal protocol**: 各ゲートの判定結果を GO/FIX/STOP で報告
- **Permission model**: 実装フェーズは FIX (execute -> report)、ファイル作成は STOP (plan -> approve)
- **Work approach**: 3+ step tasks のルールを Pipeline で自動適用
- **Transparency for delegation**: エージェント使用時の一覧提示

## External Pattern Adoption

Spec Kit はDCRを置き換えるランタイムではなく、gate品質を高める参照パターンとして扱う。

| External pattern | DCR mapping |
|---|---|
| `/speckit.clarify` | p/ の要求明確化 |
| `/speckit.analyze` | p/ 後、実装前の矛盾検出 |
| `/speckit.checklist` | q/ で使う受け入れチェックリスト |
| `spec-kit-doctor` | `harness-audit` と `validate.ps1` |
| `spec-kit-repoindex` | `context-optimization` と正本優先探索 |
| `spec-kit-review` | q/ のレビュー観点 |
| `spec-kit-threatmodel` | `security-scan` / `security-deepdive` |
