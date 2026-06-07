---
name: tech-debt-tracker
routing_category: devops
description: "技術的負債の可視化・SQALE指標・TODO/FIXME棚卸し・返済計画作成・スプリント組み込み"
disable-model-invocation: true
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
  - copilot
  - cursor
  - gemini-cli
---

# Tech Debt Tracker

## 基本原則

- 技術的負債はゼロにできない——優先度をつけて管理する
- 「いつか直す」は「永遠に直さない」——スプリントに組み込む
- 定量化することで経営への説明責任を果たす

## 技術的負債の4分類

| 分類 | 例 | 影響 |
|------|-----|------|
| コード品質 | 重複コード・長大関数・マジックナンバー | 開発速度低下 |
| アーキテクチャ | モノリス肥大化・密結合・循環依存 | 変更コスト増大 |
| テスト | カバレッジ不足・壊れたテスト・テストなし | バグ検出遅延 |
| ドキュメント | API仕様未整備・設計図の陳腐化 | オンボーディング遅延 |

## SQALE 指標による定量化

- **技術的負債比率** = 返済コスト / 開発コスト × 100
  - A: 0-5% ← 健全
  - B: 6-10%
  - C: 11-20%
  - D: 21-50%（要注意）
  - E: 50%超（危険）
- ツール: SonarQube / CodeClimate で自動計算

## TODO / FIXME コメント棚卸し

```bash
# TODO/FIXMEの総数を確認
grep -rn "TODO\|FIXME\|HACK\|XXX" src/ --include="*.ts" | wc -l

# 古いTODOを特定（6ヶ月以上前のコミット）
git log --all --format="%H %ai" | while read hash date; do
  git show $hash:src/ 2>/dev/null | grep -n "TODO" && echo "$hash $date"
done
```

棚卸し頻度: 四半期ごとに全TODO/FIXMEをレビュー

## 負債返済コスト見積もり

```markdown
| 負債 | 場所 | 分類 | 返済見積もり | 影響度 | 優先度 |
|------|------|------|------------|--------|--------|
| 認証ロジック重複 | auth/*.ts (5箇所) | コード品質 | 2日 | 高 | P1 |
| ユーザーモデル肥大化 | user/model.ts | アーキテクチャ | 5日 | 高 | P2 |
| E2Eテスト未整備 | /checkout | テスト | 3日 | 中 | P2 |
```

## スプリントへの組み込み方法

- **20%ルール**: スプリントキャパシティの20%を負債返済に充てる
- **ボーイスカウトルール**: 触ったファイルは必ず少し改善する
- **負債バックログ**: 専用のバックログアイテムとして管理
- 新機能開発と負債返済を1:4で組み合わせる（重症の場合は逆転）

## 可視化ダッシュボード

- 週次: SonarQube の Technical Debt Ratio を追跡
- 月次: TODO/FIXME 件数のトレンド
- 四半期: 返済した負債と新たに生まれた負債のバランス

## チェックリスト

- [ ] SonarQube / CodeClimate を CI に組み込み済み
- [ ] 技術的負債バックログを作成済み
- [ ] スプリントに20%の返済時間を確保
- [ ] 四半期ごとのTODO棚卸し実施
