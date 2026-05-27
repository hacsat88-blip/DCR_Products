---
name: security-scan
routing_category: devops
description: "agent 設定、rules/skills、hook 相当設定を対象に、シークレット露出・危険な権限・注入リスクを監査する。設定面の浅い監査（shallow depth）。コードレベルのOWASP/暗号/認証の深掘り審査には security-deepdive を使用。"
audit_depth: shallow
audit_scope: config-and-secrets
sibling: security-deepdive
disable-model-invocation: true
baseline:
  upstream: "openai/skills"
  role: overlay
  local_delta:
    - "DCR catalog/config shallow scan"
    - "external skill/plugin collision checks"
    - "source-of-truth replacement guardrails"
---

# Security Scan

## OpenAI Baseline Overlay

Use the OpenAI official `codex-security:security-scan` skill for full security
scan behavior. This DCR skill is only the shallow catalog/config overlay for
rules, skills, hooks, external packs, and source-of-truth replacement risks. Use
`security-deepdive` or the OpenAI security baseline for code-level OWASP,
authentication, crypto, or dependency analysis.

## いつ使うか

- ルール/スキルを追加・更新した後
- PR 前の最終確認
- 定期的な構成監査

## 重点チェック

- Secrets: API key/token/password のハードコード
- Permissions: 過剰な実行権限、無制限操作
- Injection: 指示文・テンプレート・文字列補間の注入リスク
- Supply Chain: 不要な自動インストールや未固定依存
- External Packs: 外部CLI/MCP/skill catalogのproject pollution、telemetry、uninstall手順

## 使い方

1. 変更ファイルを対象にスキャン
2. `critical/high/medium/info` で分類
3. critical/high が 0 になるまで修正

## External Pack Checklist

外部素材をDCRに取り込む前に確認する:

- README と license が確認できる
- Windows native / WSL / PowerShell の制約が明記されている
- インストールが repo-tracked file を勝手に書かない、または書く範囲が明確
- telemetry が opt-in か、無効化手順が明確
- uninstall / rollback 手順がある
- hook や MCP が危険なコマンドを自動実行しない
- DCR正本 (`.ai/catalog`, `.ai/kernel`, `.ai/book`) を置き換えない

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
