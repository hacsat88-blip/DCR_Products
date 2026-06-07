---
name: improve-codebase-architecture
routing_category: devops
description: コードベースの構造改善ポイントを探索し、浅いモジュールを深くし、テスタビリティと変更容易性を高める改善案を提示する。
metadata:
  origin: mattpocock/skills
  upstream_url: "https://github.com/mattpocock/skills"
  upstream_paths:
    - "skills/engineering/improve-codebase-architecture/SKILL.md"
    - "skills/engineering/zoom-out/SKILL.md"
  upstream_license: "MIT"
  imported_at: "2026-05-16"
  adapted_from: "Architecture improvement and zoom-out context patterns; no skills.sh installer or slash command imported."
  model_neutral: true
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

# Improve Codebase Architecture

## 目的

アーキテクチャ上のボトルネックを見つけ、壊しにくく変更しやすい構造へ段階的に改善する。

## いつ使うか

- 実装速度が落ちている
- 変更時に影響範囲が読みにくい
- テスト追加が難しい/重い
- 似たコードが各所に散在している

## 評価観点

1. モジュール境界
2. 依存方向（一方向か、循環がないか）
3. 凝集度/結合度
4. 入出力の明確さ（副作用の管理）
5. テスタビリティ
6. 命名と責務の一致

## 調査手順

0. `architecture-zoom-out` で一段上の map が必要か判定する
1. 主要ユースケースの呼び出し経路を追跡
2. 変更頻度の高いファイルを特定
3. 「一緒に変わるコード」をクラスタ化
4. 循環依存・過剰共有状態を列挙
5. 浅いモジュール（呼び出し側に詳細を漏らす薄い wrapper）を探す
6. 深いモジュール（小さい interface で大きい責務を隠せる単位）へ寄せる案を作る
7. 小さく安全な改善単位へ分割

## 出力フォーマット

- Findings（問題）
- Impact（なぜ痛いか）
- Proposal（最小改善）
- Risk（副作用）
- Validation（どう検証するか）
- Rollout（段階導入案）

## 提案のルール

- 大規模再設計より、段階的改善を優先
- 公開 API 互換を壊さない案を優先
- 各提案に検証手順を必ず含める
- 1提案 = 1PR で出せるサイズを目安にする
- 提案前に、既存の用語、ADR、正本/生成物境界を確認する
- 改善案は「何を隠し、どの interface を深くするか」で説明する

## 典型的な改善例

- ルーティング層から業務ロジックを分離
- IO と純粋関数を分離してテスト容易化
- 巨大クラスを責務ごとに分割
- 共有ユーティリティをドメイン別モジュールへ再配置
- 例外ハンドリングの責務を境界層に集約

## 成果物テンプレート

```markdown
## Finding
[観測した問題]

## Impact
[開発速度・品質への影響]

## Proposal
[最小実装での改善方針]

## Validation
- [ ] 既存テストパス
- [ ] 追加テストで再現/防止を確認
- [ ] パフォーマンス回帰なし

## Rollout
1. Step 1 ...
2. Step 2 ...
3. Step 3 ...
```

実運用では `ISSUE_TEMPLATE.md` をそのまま複製して使う。
