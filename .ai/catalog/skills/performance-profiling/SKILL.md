---
name: performance-profiling
routing_category: devops
deprecated: true
successor: dcr-pipeline
deprecation_reason: "Folded into dcr-pipeline q/ Performance Gate for OpenAI Skills baseline slimming."
description: 言語別プロファイリング手法、ボトルネック分析、最適化戦略の実践ガイド。測定に基づく性能改善を実現する。
contract:
  preconditions:
    - "パフォーマンス問題または最適化対象が特定されている"
    - "ベースライン測定が実施済みまたは実施可能"
  postconditions:
    - "ボトルネックが特定され、改善策が提示される"
    - "改善前後の比較測定が計画される"
  invariants:
    - "推測ではなく測定に基づいて最適化する"
    - "可読性と保守性を著しく損なう最適化は避ける"
composable:
  input_type: codebase
  output_type: performance-report
  chains_with:
    - systematic-debugging
    - code-review
package:
  version: "1.0.0"
  compat: "dcr >= 2.0"
  exports:
    - SKILL.md
  dependencies: []
  tags:
    - performance
    - profiling
    - optimization
---

# Performance Profiling

## 目的

推測ではなく測定に基づいて、コードとシステムのパフォーマンスを改善する。

## いつ使うか

- レスポンスタイムが目標を超過している
- メモリ使用量が異常に増加している
- CPU使用率が高止まりしている
- ビルド/テスト/デプロイが遅い

## 基本原則

1. **まず測定する** — 推測で最適化しない
2. **ボトルネックを特定する** — 全体の80%を占める20%の箇所を見つける
3. **1つずつ変更する** — 複数の変更を同時にしない
4. **改善を測定する** — 変更前後でベンチマークを比較する
5. **十分で止める** — 目標を達成したら過剰最適化しない

## 言語別プロファイリングツール

### JavaScript / TypeScript (Node.js)

```bash
# CPU プロファイル
node --prof app.js
node --prof-process isolate-*.log > profile.txt

# Chrome DevTools 連携
node --inspect app.js

# ヒープスナップショット
node --heap-prof app.js
```

**ツール**: `clinic.js`, `0x`, `autocannon` (HTTP ベンチマーク)

### Python

```bash
# cProfile
python -m cProfile -s cumulative script.py

# line_profiler (行単位)
kernprof -l -v script.py

# memory_profiler
python -m memory_profiler script.py
```

**ツール**: `py-spy` (サンプリング), `scalene` (CPU+メモリ+GPU)

### Go

```bash
# pprof
go test -bench . -cpuprofile cpu.prof
go tool pprof cpu.prof

# トレース
go test -trace trace.out
go tool trace trace.out
```

### 共通 Web

- **Lighthouse**: Core Web Vitals (LCP, FID, CLS)
- **WebPageTest**: 詳細なウォーターフォール分析
- **Chrome DevTools Performance**: ランタイムプロファイリング

## ボトルネック分析フレームワーク

### 分類

| カテゴリ | 症状 | 典型的な原因 |
|----------|------|-------------|
| CPU バウンド | CPU 100%、応答遅延 | N+1 ループ、非効率アルゴリズム |
| I/O バウンド | CPU 低い、応答遅延 | DB クエリ、外部API、ディスクI/O |
| メモリ | OOM、GC 頻発 | メモリリーク、巨大オブジェクト |
| 同時実行 | 間欠的遅延 | ロック競合、コネクションプール枯渇 |

### 調査手順

1. **メトリクスを確認**: CPU/メモリ/I/O の全体傾向
2. **プロファイルを取得**: 上位5関数の累積時間を確認
3. **ホットパスを特定**: 呼び出し回数 × 1回あたり時間
4. **仮説を立てる**: 原因を1つに絞る
5. **改善を実装**: 最小限の変更
6. **再測定**: 改善を数値で確認

## 最適化パターン

| パターン | 適用条件 | 効果 |
|----------|---------|------|
| キャッシュ導入 | 同じ計算/クエリの繰り返し | 10-1000x |
| バッチ処理 | N+1 クエリ | 10-100x |
| インデックス追加 | フルスキャンクエリ | 10-1000x |
| 非同期化 | I/O待ちのブロッキング | 2-10x |
| アルゴリズム改善 | O(n²) → O(n log n) | データ量依存 |
| 遅延読み込み | 初期化時の過剰読み込み | 起動時間改善 |

## レポートフォーマット

```markdown
## Performance Report — [対象名]

### ベースライン
- [メトリクス]: [値] ([測定日時], [条件])

### ボトルネック
1. [箇所] — [原因] — [影響度]

### 改善策
1. [変更内容] — 期待効果: [x%改善]

### 改善後
- [メトリクス]: [値] ([測定日時])
- 改善率: [x%]
```
