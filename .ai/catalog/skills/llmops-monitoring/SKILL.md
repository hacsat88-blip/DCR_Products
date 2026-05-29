---
name: llmops-monitoring
routing_category: devops
description: "本番LLMのモニタリング設計：出力品質・コスト・レイテンシ・プロンプトバージョン管理"
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
  - windsurf
  - opencode
  - gemini-cli
---

# LLMOps Monitoring

## 基本原則

- LLMの品質劣化は静かに始まる（定量監視が必須）
- コストとレイテンシのトレードオフを常に測定する
- プロンプト変更はコード変更と同等の管理が必要

## 品質メトリクス

- Hallucination Rate: 事実確認テストセットで週次測定
- Faithfulness: RAGAS / TruEra で自動評価
- User Feedback: 👍/👎 フィードバックでヒューマンラベル収集
- Drift Detection: 出力分布の統計的変化を追跡

## コスト管理

- トークン消費: input/output 別に追跡（モデル別単価×消費量）
- 予算アラート: 日次/月次上限設定（50%/80%/100%で段階通知）
- Prompt Cache Hit率を KPI に設定
- モデルコスト比較: 同等品質なら安価モデルへ切り替え

## レイテンシ監視

- p50/p90/p99 レイテンシを追跡
- TTFT（Time-to-First-Token）を分離測定
- ストリーミング vs バッチのコスト効果比較

## ツール選定

| ツール | 適用場面 |
|--------|---------|
| LangSmith | LangChainベースのアプリ |
| Langfuse | OSS・セルフホスト可 |
| Helicone | プロキシ形式で即導入 |
| Arize Phoenix | 評価・デバッグ特化 |

## プロンプトバージョン管理

- Git でプロンプトを管理（`.prompts/` ディレクトリ）
- セマンティックバージョニング（major: 動作変更、minor: 改善）
- A/Bテスト: 新旧プロンプトを並行実行し品質比較
- 変更ログ: なぜ変更したか理由を必ず記録

## アラート条件の例

- Hallucination Rate > 5% → Slack通知
- コスト > 日次予算の80% → 担当者通知
- p99 レイテンシ > 10秒 → エスカレーション
- エラーレート > 1% → インシデント起票
