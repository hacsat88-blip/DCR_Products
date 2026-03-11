# Decision Trace Template v1.0

> 判断の監査記録の外部ナレッジ。FORGE §4 Decision Format > Decision Trace から参照される。
> 本テンプレートが未提供の場合、FORGEは自由形式で簡潔に記す。

- Version: 1.0
- Date: 2026-03-01

---

## 使用条件

- Deep時に自動出力する。ユーザーが明示要求した場合はどの深度でも出力する
- 成果物本文とは分離し、末尾のコードブロック内に収める
- Quick時は省略可

---

## フィールド定義

```yaml
decision_trace:
  mode: ""          # V / L / F（Vision / Logic / Fusion）
  claim_summary: "" # 推奨案の1行要約 + Claim Type（Fact / Inference / Unknown）
  key_assumptions:  # キーストーン前提。崩れると結論が反転するもの。1〜3つ
    - assumption: ""
      confidence: "" # High / Mid / Low
      verify_by: ""  # 検証方法（72h Test または Micro-Test への参照）
  confidence_basis: "" # 確信度の根拠1行。最も弱い環を明示する
  carry_forward: ""    # 次ターンへの持ち越し事項1行
  fixed_points: []     # 反復時: 維持された固定点のリスト
  changed: []          # 反復時: 今回変更された要素のリスト
```

---

## 深度別の省略ルール

| フィールド | Quick | Standard | Deep |
|-----------|-------|----------|------|
| mode | 省略可 | 出力 | 出力 |
| claim_summary | 省略可 | 出力 | 出力 |
| key_assumptions | 省略可 | 最大1つ | 最大3つ |
| confidence_basis | 省略可 | 出力 | 出力 |
| carry_forward | 省略可 | 出力 | 出力 |
| fixed_points | 省略可 | 反復時のみ | 反復時のみ |
| changed | 省略可 | 反復時のみ | 反復時のみ |

---

## 出力例

### Deep時（初回）

```yaml
decision_trace:
  mode: L
  claim_summary: "マイクロサービス分割を先行する [Inference]"
  key_assumptions:
    - assumption: "現行モノリスのAPI境界が明確"
      confidence: Mid
      verify_by: "72h Test: 依存関係マップを作成し、循環依存が3箇所以内か確認"
    - assumption: "チームに分散システム運用経験がある"
      confidence: Low
      verify_by: "Micro-Test: テックリードに30分ヒアリング"
  confidence_basis: "チームの運用経験が未検証のため、総合confidence = Low"
  carry_forward: "依存関係マップの結果次第で分割戦略を再評価"
```

### Deep時（反復2ターン目）

```yaml
decision_trace:
  mode: L
  claim_summary: "段階的分割（認証サービスを先行抽出）に変更 [Inference]"
  key_assumptions:
    - assumption: "認証サービスのAPI境界が最も明確"
      confidence: High
      verify_by: "72h Test: 認証サービスのスタブ化で既存テストが通るか確認"
  confidence_basis: "依存関係マップで認証の独立性を確認済。Strengthened"
  carry_forward: "認証スタブ化の結果を次ラウンドで評価"
  fixed_points: ["マイクロサービス化の方針", "段階的アプローチ"]
  changed: ["分割順序: 全面→認証先行に変更", "チーム体制: ペアプロ導入を追加"]
```

---

## Verification Cycle連携

Verification Cycleが発動している場合（ユーザーが検証結果を報告）:
- key_assumptionsの各項目にverification_result（Strengthened / Refuted / Unchanged）を追記する
- Refutedの場合、代替前提を新たなkey_assumptionとして追加する
- confidence_basisにconfidence_delta（前回からの変動）を追記する

```yaml
# Verification Cycle連携時の追記例
key_assumptions:
  - assumption: "現行モノリスのAPI境界が明確"
    confidence: High  # Mid → High
    verify_by: "完了"
    verification_result: Strengthened
    confidence_delta: "Mid→High. 依存関係マップで確認"
```
