---
name: multi-repo-sync
routing_category: devops
description: "複数リポジトリ変更管理：依存関係グラフ・変更影響分析・同期PR戦略・ロールバック伝播"
disable-model-invocation: true
---

# Multi-Repo Sync

## 基本原則

- リポジトリ間の依存関係を明示的に管理する（暗黙の依存禁止）
- 変更の波及範囲を事前に特定してから着手する
- ロールバックは逆順で伝播させる

## 依存関係グラフ設計

```
repo-api (v2.3.0)
    ├── repo-frontend (depends on api ^2.0)
    ├── repo-mobile (depends on api ^2.0)
    └── repo-sdk (re-exports api types)
         └── repo-third-party-app (depends on sdk)
```

- 依存関係は `DEPENDENCIES.md` または `workspace.json` に明記
- セマンティックバージョニングでAPI互換性を表現
- 循環依存を検出するCIチェックを設置

## 変更影響分析手順

1. 変更を加えるリポジトリ（Upstream）を特定
2. 依存グラフをたどり影響を受けるリポジトリ（Downstream）を列挙
3. Breaking change か Non-breaking change かを判定
4. 各Downstreamのオーナーに事前通知

```bash
# 影響範囲チェックスクリプト例
scripts/check-impact.sh repo-api v2.4.0
# → Affected: repo-frontend, repo-mobile, repo-sdk
# → Breaking: YES (removed /v1/ endpoints)
```

## 同期PR作成戦略

### 直列（順次）戦略
- Upstream → SDK → Frontend の順にPRを作成・マージ
- 安全だが時間がかかる
- Breaking change には必ずこの戦略を採用

### 並列戦略
- 全Downstream同時にPR作成（feature branch使用）
- Upstream がマージされたら一斉マージ
- Non-breaking change のみ適用可

## ロールバック伝播手順

1. 問題を検出したリポジトリから開始
2. 依存グラフを**逆順**にたどりロールバック
3. 各リポジトリで `git revert <merge-commit>` を実行
4. 全リポジトリのCIが通過したことを確認

## チェックリスト

- [ ] 変更前に影響範囲を確認（依存グラフ参照）
- [ ] Breaking change は Deprecation期間を設ける
- [ ] 全Downstreamのオーナーに通知済み
- [ ] 変更後の統合テストを実施
- [ ] ロールバック手順を事前確認
