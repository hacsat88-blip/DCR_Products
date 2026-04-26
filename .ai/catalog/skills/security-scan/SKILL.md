---
name: security-scan
description: "agent 設定、rules/skills、hook 相当設定を対象に、シークレット露出・危険な権限・注入リスクを監査する。設定面の浅い監査（shallow depth）。コードレベルのOWASP/暗号/認証の深掘り審査には security-deepdive を使用。"
audit_depth: shallow
audit_scope: config-and-secrets
sibling: security-deepdive
disable-model-invocation: true
---

# Security Scan

## いつ使うか

- ルール/スキルを追加・更新した後
- PR 前の最終確認
- 定期的な構成監査

## 重点チェック

- Secrets: API key/token/password のハードコード
- Permissions: 過剰な実行権限、無制限操作
- Injection: 指示文・テンプレート・文字列補間の注入リスク
- Supply Chain: 不要な自動インストールや未固定依存

## 使い方

1. 変更ファイルを対象にスキャン
2. `critical/high/medium/info` で分類
3. critical/high が 0 になるまで修正

## 出力テンプレート

```markdown
SECURITY SCAN: PASS/FAIL
- critical: N
- high: N
- medium: N
- info: N

Remediation:
1) ...
2) ...
```
