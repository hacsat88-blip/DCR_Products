---
name: dcr-pipeline
routing_category: governance
description: "DCR Kernel のゲート連鎖 (p/ -> 実装 -> q/ -> sh/) を自動管理するパイプラインSkill。実装タスク開始時・完了時・リリース判定時に自動的に次ゲートへ誘導し、各ゲート通過条件をチェックする。Use when starting implementation tasks, completing features, or preparing for release."
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

## When to Activate

- ユーザーが実装タスクを依頼したとき（3ステップ以上の変更）
- `p/` トリガーが使われたとき
- 実装が完了し、次のゲートへの誘導が必要なとき
- Spec-first の clarify / analyze / checklist / doctor 相当の確認が必要なとき

## Phase 1: Plan Gate (p/)

### 入口条件
- ユーザーから実装要件が提示されている
- 対象ファイル・スコープが特定できる

### 実行内容
1. 対象ファイルを読み、現状を把握する
2. 変更スコープを箇条書きで定義する
3. 実装順序を依存関係に基づいて決定する
4. 検証方法を各変更項目に対して定義する
5. **チェックリストを生成する**（後のQA Gateで使用）
6. 必要に応じて `model-route` で実装時のモデル階層を決める
7. Spec-first 補強が必要なら、以下を Plan に織り込む:
   - clarify: 不明な要求、非目標、制約を実装前に固定
   - analyze: spec / plan / tasks / code の矛盾を検出
   - checklist: 受け入れ条件を検証可能な項目へ分解
   - doctor: 正本、生成物、検証コマンド、外部依存の健全性を確認

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
6. 必要に応じて spec-kit review / threatmodel 相当の観点を追加する:
   - review: 実装品質、テスト、エラー処理、単純性
   - threatmodel: LLM/agent artifact、外部入力、権限、注入リスク

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
3. リリース判定: GO Ship可能 / STOP ブロッカーあり
4. コミットメッセージ案の提示
5. 必要時は `harness-audit` を実行し、運用負債を次サイクルに繰り越さない

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
