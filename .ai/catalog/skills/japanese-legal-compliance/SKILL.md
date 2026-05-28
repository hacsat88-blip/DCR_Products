---
name: japanese-legal-compliance
routing_category: governance
description: "日本法令コンプライアンス：個人情報保護法・金商法・景表法・電帳法の対応チェックリスト"
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

# Japanese Legal Compliance

## 基本原則

- 法令は最低ラインであり、ユーザー信頼の基盤として超えることを目指す
- 曖昧な解釈は法務専門家に確認する（このスキルは網羅的チェックリスト）
- 対応記録を残す（いつ・何を・どう対応したか）

## 個人情報保護法（APPI）チェックリスト

- [ ] 利用目的の特定・明示（プライバシーポリシーに記載）
- [ ] 取得時の同意取得（チェックボックス・同意ログ保存）
- [ ] 第三者提供の制限確認（提供先・目的・項目を記録）
- [ ] 開示・訂正・利用停止請求の対応フロー整備
- [ ] 安全管理措置（暗号化・アクセスログ・委託先管理）
- [ ] 個人情報取扱事業者の届け出確認（要配慮個人情報含む）
- [ ] 漏洩時の報告義務（個人情報保護委員会・本人への通知）

## 金融商品取引法（金商法）チェックリスト

- [ ] 投資助言業・投資運用業の登録要否確認
- [ ] 重要事項説明義務（リスク・手数料・クーリングオフ）
- [ ] 広告規制遵守（誇大広告・断定的判断の提供禁止）
- [ ] 適合性原則（顧客属性に合わない金融商品を勧誘しない）
- [ ] インサイダー取引規制の社内ルール整備

## 景品表示法（景表法）チェックリスト

- [ ] 優良誤認表示の確認（根拠のない「No.1」「最安値」禁止）
- [ ] 有利誤認表示の確認（比較対象・条件の明示）
- [ ] 景品の上限額確認（オープン懸賞・クローズド懸賞別）
- [ ] 口コミ・レビューのステルスマーケティング対策

## 電子帳簿保存法（電帳法）チェックリスト

- [ ] 電子取引データの保存要件確認（検索機能要件）
- [ ] スキャナ保存の要件確認（タイムスタンプ・解像度）
- [ ] 訂正削除履歴の保存設計
- [ ] 保存期間の確認（法定7年）

## 不正競争防止法（営業秘密管理）

- [ ] 営業秘密の3要件確認（秘密管理性・有用性・非公知性）
- [ ] アクセス制限設定（NDAと合わせて管理）
- [ ] 退職者への秘密保持誓約書取得

> ⚠️ このチェックリストは参考情報です。具体的な対応は法務専門家に相談してください。
