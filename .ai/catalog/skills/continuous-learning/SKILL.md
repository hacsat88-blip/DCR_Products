---
name: continuous-learning
description: '[DEPRECATED — superseded by continuous-learning-v2] 継続学習スキルの v1。すべての機能は v2 に統合済み（project/global スコープ + confidence + status/export/import/evolve/promote）。'
metadata:
  origin: ECC continuous-learning-v2 (adapted for DCR)
deprecated: true
successor: continuous-learning-v2
deprecation_reason: A-2e。v2が完全上位互換のため、v1は alias として残し新規参照は v2 へ
---

> **DEPRECATED**: このスキルは [continuous-learning-v2](../continuous-learning-v2/SKILL.md) に置き換えられました。新規参照には v2 を使用してください。


# Continuous Learning — セッションの学びを蓄積する

## v2 との関係

- この skill は標準記録フロー（instinct の収集と蓄積）を担当する
- `skills/continuous-learning-v2/SKILL.md` は scope/confidence を使った高度運用（status/export/import/evolve/promote）を担当する
- まず本 skill で記録し、再利用性が見えた段階で v2 の promote ルールに従って昇格する

## 目的

セッション中に得た知見を `/memories/repo/` に構造化して記録し、
次回以降のセッションで同じ失敗を繰り返さない。

## パス解釈の注意

- `/memories/...` は Copilot のメモリ名前空間であり、OS のルート絶対パスではない
- リポジトリ固有の学習内容は `/memories/repo/` に保存する（Copilot 管理領域）
- `/memories/` は Git 管理対象ではないため、チーム共有したい知見は `skills/` または `rules/` へ昇格する
- 迷った場合は「まず `/memories/repo/` に記録し、繰り返し有効ならコードベースへ昇格」の順序を使う

## いつ使うか

- エラーを解決したとき（根本原因 + 修正手順を記録）
- ユーザーに修正されたとき（期待と実際のギャップを記録）
- 回避策や非自明な手順を発見したとき
- プロジェクト固有の規約・癖を学んだとき
- セッション終了時（振り返りチェック）

## 観察カテゴリ

| カテゴリ | 記録対象 | 例 |
|---------|---------|---|
| error_resolution | エラーの根本原因と修正 | `git status --short` の出力切り詰め問題 |
| user_correction | ユーザーによる指摘・修正 | 命名規約の誤り、間違ったAPIの提案 |
| workaround | 標準手順では通らない回避策 | 特定ツールの制約回避 |
| pattern | 繰り返し現れる設計パターン | deploy.ps1 の `_` プレフィクス除外 |
| project_specific | リポジトリ固有の知識 | ファイル配置規則、ビルド手順 |

## Instinct 記録フォーマット

`/memories/repo/` 内の該当ファイルに以下の形式で追記する:

```markdown
## [カテゴリ] 簡潔なタイトル
- confidence: low | medium | high
- context: どの状況で発生したか
- learning: 何を学んだか（1-2行）
- action: 次回どうすべきか（1-2行）
```

### Confidence レベル

| レベル | 基準 | 扱い |
|-------|------|-----|
| **low** | 1回の観察、未検証 | 参考情報として記録。次回観察時に再評価 |
| **medium** | 2回以上の観察、または根拠あり | 通常の判断基準として使用 |
| **high** | 複数回検証済み、ドキュメント裏付あり | 確定知識として信頼 |

### Confidence の昇格ルール

- 同じ instinct が別セッションで再確認された → 1段階昇格
- ドキュメントや公式ソースで裏付けが取れた → high へ直接昇格
- 矛盾する観察があった → low へ降格し注記を追加

## 記録先の選び方

| 性質 | 記録先 | 理由 |
|------|-------|------|
| リポジトリ固有の知見 | `/memories/repo/<topic>.md` | Copilot の repo scope（非Git管理） |
| ユーザーの一般的な好み | `/memories/<topic>.md` | ユーザー共通メモリ（非Git管理） |
| 今のタスクだけの一時メモ | `/memories/session/<topic>.md` | セッション終了で消える |

## Git 共有との関係

- `/memories/*` は学習メモ用途であり、リポジトリのコミット履歴には含まれない
- チームで再利用する運用ルールは `skills/` か `rules/` へ反映して PR で共有する
- 1回限りの観察はメモリ、再利用ルールはコードベースという責務分離を守る

## セッション終了時の振り返り

長いセッションの終了前に以下を自問する:

1. **エラー解決**: 今回解決したエラーに再現性はあるか？ → 記録
2. **修正指摘**: ユーザーに修正された点はあるか？ → 記録
3. **発見**: プロジェクト固有の制約・規約を新たに学んだか？ → 記録
4. **回避策**: 標準手順では通らなかった箇所はあるか？ → 記録
5. **既存 instinct**: 過去の記録と矛盾・重複はないか？ → 更新

## 既存ファイルとの関係

このスキルは `/memories/repo/` に既にあるファイルを活用する。
例: `space-sawaru-notes.md` は project_specific カテゴリの instinct 集合として扱える。

新しい instinct ファイルを作る前に:
1. `/memories/repo/` の既存ファイルを確認する
2. 関連するファイルがあれば追記する
3. 新しいトピックの場合のみ新規ファイルを作成する

## Skill 昇格パス

繰り返し現れる高 confidence の instinct 群は、独立した Skill への昇格を検討する:

```
instinct (low) → instinct (high) → skill 候補として提案
```

昇格の条件:
- 3つ以上の関連 instinct が high confidence に到達
- 明確なワークフローとして記述できる
- 他プロジェクトでも適用可能

昇格時は以下を提案する:
```
💡 p/ で「[トピック]」を独立Skillとして設計します
```

## v2 運用への接続

この Skill は日次運用の入口として維持し、より高度な運用は `continuous-learning-v2` に接続する。

- project/global のスコープ分離が必要な場合
- confidence を用いた昇格判定をしたい場合
- instinct の `evolve/promote` で再利用資産化したい場合

推奨フロー:

1. `continuous-learning` で知見を記録
2. `continuous-learning-v2` でクラスタ化と昇格判定
3. `rules-distill` で rule 化候補を抽出
