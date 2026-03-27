---
name: continuous-learning
description: "セッション中の学びを構造化して記録し、リポジトリ固有の知見を蓄積する継続学習スキル。エラー解決、ユーザー修正、回避策、プロジェクト固有パターンを /memories/repo/ に instinct として記録する。Use when completing tasks, resolving errors, discovering project-specific patterns, or at session end for retrospective."
origin: ECC continuous-learning-v2 (adapted for DCR)
---

# Continuous Learning — セッションの学びを蓄積する

## 目的

セッション中に得た知見を `/memories/repo/` に構造化して記録し、
次回以降のセッションで同じ失敗を繰り返さない。

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
| リポジトリ固有の知見 | `/memories/repo/<topic>.md` | リポジトリに紐づく |
| ユーザーの一般的な好み | `/memories/<topic>.md` | 全ワークスペース共通 |
| 今のタスクだけの一時メモ | `/memories/session/<topic>.md` | セッション終了で消える |

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
