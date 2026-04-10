---
name: security-deepdive
description: OWASP Top 10 深掘り、暗号選定、認証認可設計、コンプライアンスチェックの実践ガイド。セキュリティ品質を体系的に確保する。
contract:
  preconditions:
    - "対象システムの技術スタックが把握されている"
    - "脅威モデルまたは保護対象が特定されている"
  postconditions:
    - "脆弱性評価レポートまたは設計ガイダンスが生成される"
    - "修正優先度がリスクベースで整理される"
  invariants:
    - "既存のセキュリティ制御を弱めない"
    - "脆弱性の詳細をログや出力に露出しない"
composable:
  input_type: codebase
  output_type: security-report
  chains_with:
    - code-review
    - verification-before-completion
package:
  version: "1.0.0"
  compat: "dcr >= 2.0"
  exports:
    - SKILL.md
  dependencies: []
  tags:
    - security
    - owasp
    - compliance
---

# Security Deepdive

## 目的

OWASP Top 10 を軸に、コードとアーキテクチャのセキュリティ品質を体系的に評価・改善する。

## いつ使うか

- セキュリティレビュー・脆弱性評価
- 認証/認可の設計・改善
- 暗号化方式の選定
- コンプライアンス対応（SOC 2, ISO 27001, GDPR, HIPAA）
- インシデント後のハードニング

## OWASP Top 10 チェック

### A01: Broken Access Control

- [ ] すべてのエンドポイントに認可チェックがある
- [ ] IDOR（Insecure Direct Object Reference）対策が実装されている
- [ ] CORS が最小限に設定されている
- [ ] ディレクトリトラバーサルが防止されている

### A02: Cryptographic Failures

- [ ] 転送中のデータは TLS 1.2+ で暗号化
- [ ] 保存時のシークレットは暗号化またはシークレットマネージャーで管理
- [ ] パスワードは bcrypt/argon2 でハッシュ化（MD5/SHA1 禁止）
- [ ] ハードコードされたシークレットがない

### A03: Injection

- [ ] SQL はパラメータバインドを使用（文字列結合禁止）
- [ ] ユーザー入力はバリデーション + サニタイズ済み
- [ ] OS コマンド実行はホワイトリスト方式
- [ ] テンプレートエンジンでの式インジェクション対策

### A04: Insecure Design

- [ ] 脅威モデリングが実施されている
- [ ] ビジネスロジックの abuse case が検討されている
- [ ] レート制限が重要エンドポイントに設定されている

### A05: Security Misconfiguration

- [ ] デフォルトクレデンシャルが変更されている
- [ ] 不要なポート/サービスが無効化されている
- [ ] エラーメッセージがスタックトレースを露出しない
- [ ] セキュリティヘッダーが設定されている（CSP, HSTS, X-Frame-Options）

### A06-A10: Additional Checks

- [ ] 依存パッケージの既知脆弱性をスキャン済み (A06)
- [ ] 認証フローが安全（MFA、ブルートフォース対策） (A07)
- [ ] ソフトウェア/データの整合性検証（CI/CD パイプラインの保護） (A08)
- [ ] セキュリティイベントのログが十分で監視されている (A09)
- [ ] SSRF 対策（外部リクエストの宛先制限） (A10)

## 暗号選定ガイド

| 用途 | 推奨 | 避ける |
|------|------|--------|
| パスワードハッシュ | Argon2id, bcrypt (cost≥12) | MD5, SHA-1, SHA-256 (salt なし) |
| 対称暗号 | AES-256-GCM | AES-ECB, DES, 3DES |
| 非対称暗号 | Ed25519, RSA-4096 | RSA-1024, DSA |
| トークン生成 | crypto.randomBytes / secrets | Math.random, uuid v4 (非暗号用途) |
| TLS | TLS 1.3 (推奨), TLS 1.2 (最低) | SSL, TLS 1.0/1.1 |

## レポートフォーマット

```markdown
## Security Assessment — [対象名]

### Critical (修正必須)
- [CVE/CWE番号] [説明] [影響] [修正案]

### High (早期修正推奨)
- ...

### Medium (計画的に対応)
- ...

### Low / Informational
- ...

### 推奨アクション (優先順)
1. ...
2. ...
3. ...
```
