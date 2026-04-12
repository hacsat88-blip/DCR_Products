# AutoTrader SP-2 Reference Advisory Design

> 対象: Excel VBA bridge consumer

## Goal

Excel VBA が POST /api/price の応答から、backend が決定した売買 action を正本として受け取りつつ、J-Quants reference snapshot を補助情報として表示・記録できるようにする。

## Design Summary

- 売買判断の正本は常に backend の action / qty / reason とする。
- reference は VBA に平坦な top-level fields として返す。入れ子 JSON や配列は追加しない。
- reference missing / stale は soft warning に留め、VBA は発注を止めない。
- hard stop 条件は execution feed 異常、backend timeout、注文異常に限定する。

## Response Contract

POST /api/price の応答は既存の TradeDecision fields を保持しつつ、以下の advisory fields を追加する。

```json
{
  "action": "hold",
  "qty": 0,
  "order_type": "成行",
  "reason": "様子見",
  "reference_status": "ok",
  "reference_price": 251.5,
  "reference_volume": 12000,
  "reference_source": "jquants_light",
  "reference_as_of": "2026-04-11",
  "reference_age_days": 1,
  "reference_gap_pct": -0.596,
  "warning_code": null,
  "warning_message": null
}
```

### Field Rules

- action: backend が最終決定した buy / sell / hold
- qty: backend が許可した最終数量
- reason: backend の判断理由
- reference_status: ok | missing | stale
- reference_price: last known J-Quants reference price。missing のときは null
- reference_volume: last known J-Quants reference volume。missing のときは null
- reference_source: jquants_light | jquants_free
- reference_as_of: reference の基準日。ISO date string
- reference_age_days: request timestamp 基準での経過日数
- reference_gap_pct: ((execution_price - reference_price) / reference_price) * 100。小数第3位で丸める
- warning_code: reference_missing | reference_stale | null
- warning_message: VBA にそのまま表示・記録できる短文

## Reference Status Policy

### ok

- last known snapshot が存在する
- as_of が request 日付から 5 日以内
- warning_code / warning_message は null

### missing

- snapshot がまだ存在しない、または取得できていない
- action はそのまま返す
- warning_code は reference_missing
- warning_message は J-Quants reference missing; execution onlyで継続

### stale

- snapshot は存在するが as_of が request 日付から 6 日以上前
- action はそのまま返す
- warning_code は reference_stale
- warning_message は J-Quants reference stale (... days); execution onlyで継続

## VBA Consumption Rules

- VBA は action / qty / reason を最優先で処理する。
- warning_code と warning_message は UI 表示と Log 記録に使う。
- reference_status が missing または stale でも、action が buy / sell なら発注継続する。
- VBA は reference fields を使って独自に hold へ上書きしない。
- Control シートには reference_status, reference_as_of, warning_message を表示する。
- Log シートには code, price, action, qty, reason, reference_status, reference_price, reference_as_of, reference_gap_pct, warning_code, warning_message を残す。
- reference_source と reference_volume は表示専用または将来拡張用とし、初版の永続化対象には含めない。

## Operational Guidance

- 初回数ティックは cache 未温間のため missing が起こりうる。これは正常。
- JQUANTS_API_KEY 未設定でも execution path は継続する。
- stale は feed 停止の直接条件ではなく、手動確認を促す warning として扱う。

## Acceptance Criteria

- backend response が上記 top-level fields を返す
- cached snapshot がある場合、reference_price / reference_as_of / reference_gap_pct が応答に入る
- snapshot が無い場合、warning_code=reference_missing を返す
- stale snapshot の場合、warning_code=reference_stale を返す
- VBA 実装者が nested JSON parser なしで必要項目を抽出できる
