---
name: zero-trust-design
routing_category: governance
description: "ゼロトラストアーキテクチャ設計：Never Trust Always Verify・BeyondCorp・SPIFFE/SPIRE・マイクロセグメンテーション"
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

# Zero Trust Design

## 基本原則

- **Never Trust, Always Verify**: ネットワーク位置に関係なく全リクエストを認証・認可する
- **Least Privilege**: 最小限の権限のみ付与し、Just-in-Time でアクセスを付与する
- **Assume Breach**: 侵害されていることを前提に設計し、横方向移動を防ぐ

## BeyondCorp 実装パターン（Google式ゼロトラスト）

```
ユーザー/デバイス → IAP (Identity-Aware Proxy) → バックエンドサービス
                      ↑
              [ID確認 + デバイス状態確認]
```

- デバイス証明書で端末の健全性を確認
- ユーザーIDとデバイスIDの両方を確認
- VPN不要——インターネット経由でも同等のアクセス制御

## SPIFFE / SPIRE によるWorkload Identity

```yaml
# SPIRE サーバー設定例
server:
  bind_address: "0.0.0.0"
  bind_port: "8081"
  trust_domain: "example.org"
  
# SVID（SPIFFE Verifiable Identity Document）発行
# フォーマット: spiffe://trust-domain/workload-name
# 例: spiffe://example.org/ns/production/sa/payment-service
```

- マイクロサービス間通信に X.509 証明書を自動発行
- mTLS（相互TLS）でサービス間を強制認証
- 証明書の有効期間を短く（24時間以内）して侵害リスクを低減

## マイクロセグメンテーション設計

```yaml
# Kubernetes NetworkPolicy例
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: payment-isolation
spec:
  podSelector:
    matchLabels:
      app: payment-service
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: order-service  # 許可: orderサービスのみ
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: payment-db  # 許可: 専用DBのみ
```

## 継続的検証メカニズム

- セッション再検証: 高リスクアクション前に再認証
- デバイス状態の継続確認（MDM経由）
- 異常行動検出（通常と異なるアクセスパターン）
- Just-in-Time アクセス: 必要な時間だけ権限を付与

## ゼロトラスト導入ロードマップ

```
Phase 1: ID管理の強化（MFA・SSO・PAM）
Phase 2: デバイス管理（MDM・証明書発行）
Phase 3: ネットワークセグメンテーション
Phase 4: Workload Identity（SPIFFE/SPIRE）
Phase 5: 継続的監視・自動対応
```

## チェックリスト

- [ ] 全サービスに IdP 認証を設定
- [ ] VPN → IAP/ゼロトラストゲートウェイへ移行計画
- [ ] サービス間通信にmTLSを設定
- [ ] NetworkPolicy で不要な通信を明示的に禁止
- [ ] Just-in-Time アクセス管理ツールの導入
